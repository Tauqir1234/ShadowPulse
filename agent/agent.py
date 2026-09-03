"""
ShadowPulse Agent
=================
Lightweight background telemetry collector (Module 1 + 2 in the
architecture diagram). Runs continuously, gathers CPU / memory / disk /
network / process / file-system / system-event data via psutil +
watchdog, and POSTs a TelemetryPayload to the FastAPI backend every
COLLECTION_INTERVAL_SECONDS.

Install as a startup service:
  - Windows: register via Task Scheduler ("At log on") or `nssm install`
    pointing at `python agent.py`, satisfying FR1 (Automatic Startup).
  - Linux/macOS (for dev/testing): a systemd unit or launchd plist works
    the same way — this script itself is OS-agnostic thanks to psutil.

Usage:
    python agent.py
Configuration is read from environment variables / a local .env file
(see .env.example).
"""
from __future__ import annotations
import os
import time
import uuid
import socket
import platform
import logging
import threading
from datetime import datetime, timezone
from collections import deque

import psutil
import requests
from dotenv import load_dotenv
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BACKEND_URL = os.getenv("SHADOWPULSE_BACKEND_URL", "http://localhost:8000")
AGENT_KEY = os.getenv("SHADOWPULSE_AGENT_KEY", "CHANGE_ME_AGENT_SHARED_SECRET")
AGENT_ID = os.getenv("SHADOWPULSE_AGENT_ID") or f"agent-{uuid.getnode():x}"
WATCH_PATH = os.getenv("SHADOWPULSE_WATCH_PATH", os.path.expanduser("~"))
COLLECTION_INTERVAL_SECONDS = int(os.getenv("SHADOWPULSE_INTERVAL", "10"))
HEARTBEAT_INTERVAL_SECONDS = int(os.getenv("SHADOWPULSE_HEARTBEAT_INTERVAL", "30"))
TOP_N_PROCESSES = int(os.getenv("SHADOWPULSE_TOP_PROCESSES", "0"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [ShadowPulse-Agent] %(levelname)s: %(message)s",
)
log = logging.getLogger("shadowpulse-agent")

HEADERS = {"X-Agent-Key": AGENT_KEY, "Content-Type": "application/json"}

# Rolling buffers so file/system events collected between collection
# cycles get flushed together with the next telemetry POST.
_file_events_buffer: deque = deque(maxlen=500)
_prior_pids: set[int] = set()


# ---------------------------------------------------------------------------
# File-system monitoring (Module: File System Monitor)
# ---------------------------------------------------------------------------
class ShadowPulseFileHandler(FileSystemEventHandler):
    """Buffers create/modify/delete/rename events for the next telemetry POST.
    Deliberately does NOT read file contents (Privacy Requirement NFR7)."""

    def _record(self, event_type: str, src_path: str, extra: dict | None = None):
        try:
            size = os.path.getsize(src_path) if os.path.exists(src_path) else None
        except OSError:
            size = None
        _file_events_buffer.append({
            "event_type": event_type,
            "file_path": src_path,
            "file_size": size,
            "file_extension": os.path.splitext(src_path)[1].lstrip("."),
            "hash": None,  # intentionally not hashing/reading contents by default
            "user": os.getenv("USERNAME") or os.getenv("USER"),
        })

    def on_created(self, event):
        if not event.is_directory:
            self._record("created", event.src_path)

    def on_modified(self, event):
        if not event.is_directory:
            self._record("modified", event.src_path)

    def on_deleted(self, event):
        if not event.is_directory:
            self._record("deleted", event.src_path)

    def on_moved(self, event):
        if not event.is_directory:
            self._record("renamed", event.dest_path)


def _watch_roots() -> list[str]:
    candidates = []
    configured_path = os.path.abspath(WATCH_PATH)
    if os.path.isdir(configured_path):
        candidates.append(configured_path)

    for partition in psutil.disk_partitions(all=False):
        mountpoint = os.path.abspath(partition.mountpoint)
        if os.path.isdir(mountpoint) and mountpoint not in candidates:
            candidates.append(mountpoint)

    roots = []
    for candidate in sorted(candidates, key=len):
        normalized_candidate = os.path.normcase(candidate)
        if not any(os.path.commonpath([normalized_candidate, os.path.normcase(root)]) == os.path.normcase(root) for root in roots):
            roots.append(candidate)
    return roots


def start_file_watcher() -> Observer:
    observer = Observer()
    watched = []
    for root in _watch_roots():
        try:
            observer.schedule(ShadowPulseFileHandler(), root, recursive=True)
            watched.append(root)
        except (OSError, PermissionError) as error:
            log.warning(f"Unable to watch filesystem root {root}: {error}")

    if not watched:
        raise RuntimeError("No accessible filesystem roots could be monitored")
    observer.start()
    log.info(f"Watching {len(watched)} filesystem root(s): {', '.join(watched)}")
    return observer


# ---------------------------------------------------------------------------
# Telemetry collection (Module 2: Telemetry Collector)
# ---------------------------------------------------------------------------
def collect_cpu() -> dict:
    try:
        load1, load5, load15 = os.getloadavg()
    except (OSError, AttributeError):
        load1 = load5 = load15 = None
    return {
        "cpu_usage_percent": psutil.cpu_percent(interval=None),
        "core_usage": psutil.cpu_percent(interval=None, percpu=True),
        "load_average_1m": load1,
        "load_average_5m": load5,
        "load_average_15m": load15,
        "cpu_temperature": _safe_cpu_temp(),
        "cores": psutil.cpu_count(logical=True),
    }


def _safe_cpu_temp() -> float | None:
    try:
        temps = psutil.sensors_temperatures()
        for entries in temps.values():
            if entries:
                return entries[0].current
    except (AttributeError, Exception):
        return None
    return None


def collect_memory() -> dict:
    vm = psutil.virtual_memory()
    sm = psutil.swap_memory()
    return {
        "total_memory": vm.total,
        "used_memory": vm.used,
        "free_memory": vm.available,
        "used_percent": vm.percent,
        "swap_total": sm.total,
        "swap_used": sm.used,
        "swap_percent": sm.percent,
    }


def collect_disks() -> list[dict]:
    disks = []
    io_before = psutil.disk_io_counters()
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
        except (PermissionError, OSError):
            continue
        disks.append({
            "disk_name": part.device,
            "total_space": usage.total,
            "used_space": usage.used,
            "free_space": usage.free,
            "used_percent": usage.percent,
            "read_bytes": getattr(io_before, "read_bytes", 0),
            "write_bytes": getattr(io_before, "write_bytes", 0),
            "disk_temperature": None,
        })
    return disks


def collect_network() -> dict:
    net = psutil.net_io_counters()
    try:
        connections = len(psutil.net_connections(kind="inet"))
    except (psutil.AccessDenied, PermissionError):
        connections = 0
    return {
        "bytes_sent": net.bytes_sent,
        "bytes_received": net.bytes_recv,
        "packets_sent": net.packets_sent,
        "packets_received": net.packets_recv,
        "active_connections": connections,
        "network_speed": None,
        "interface": "all",
    }


def collect_processes() -> list[dict]:
    global _prior_pids
    current_pids = set()
    procs = []
    total_memory = psutil.virtual_memory().total
    for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
        try:
            info = p.info
            current_pids.add(info["pid"])
            procs.append({
                "pid": info["pid"],
                "ppid": None,
                "process_name": info.get("name") or "unknown",
                "command_line": None,
                "user": None,
                "cpu_percent": info.get("cpu_percent") or 0.0,
                "memory_percent": round(info.get("memory_percent") or 0.0, 3),
                "memory_mb": round(((info.get("memory_percent") or 0.0) / 100) * total_memory / 1024 / 1024, 1),
                "threads": 0,
                "status": "running",
                "event_type": "created" if info["pid"] not in _prior_pids else "running",
                "created_by": None,
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    _prior_pids = current_pids
    procs.sort(key=lambda x: x["cpu_percent"], reverse=True)
    return procs[:TOP_N_PROCESSES] if TOP_N_PROCESSES > 0 else procs


def collect_system_events() -> list[dict]:
    """Lightweight system-event sampling. On Windows this can be extended
    with `win32evtlog` (PyWin32) to read the Security/System event logs;
    kept OS-agnostic here so the agent runs anywhere for dev/testing."""
    events = []
    boot_time = datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc)
    uptime_seconds = (datetime.now(timezone.utc) - boot_time).total_seconds()
    if uptime_seconds < COLLECTION_INTERVAL_SECONDS * 2:
        events.append({
            "event_type": "system_boot",
            "event_source": platform.system(),
            "event_id_code": 6005,
            "level": "info",
            "message": "System recently started.",
        })
    return events


def flush_file_events() -> list[dict]:
    events = list(_file_events_buffer)
    _file_events_buffer.clear()
    return events


# ---------------------------------------------------------------------------
# Networking helpers
# ---------------------------------------------------------------------------
def register_agent():
    payload = {
        "agent_id": AGENT_ID,
        "system_hostname": socket.gethostname(),
        "os_type": platform.system(),
        "os_version": platform.version(),
        "ip_address": _local_ip(),
        "mac_address": ":".join(f"{(uuid.getnode() >> ele) & 0xff:02x}" for ele in range(0, 8 * 6, 8))[::-1],
        "agent_version": "1.0.0",
    }
    try:
        r = requests.post(f"{BACKEND_URL}/api/agent/register", json=payload, headers=HEADERS, timeout=10)
        r.raise_for_status()
        log.info(f"Registered as {AGENT_ID} ({socket.gethostname()})")
    except requests.RequestException as e:
        log.error(f"Registration failed (will retry telemetry anyway): {e}")


def _local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "127.0.0.1"


def send_heartbeat_loop():
    while True:
        try:
            requests.post(
                f"{BACKEND_URL}/api/agent/heartbeat",
                json={"agent_id": AGENT_ID, "status": "online"},
                headers=HEADERS, timeout=10,
            )
        except requests.RequestException as e:
            log.warning(f"Heartbeat failed: {e}")
        time.sleep(HEARTBEAT_INTERVAL_SECONDS)


def send_telemetry(payload: dict):
    try:
        r = requests.post(f"{BACKEND_URL}/api/agent/telemetry", json=payload, headers=HEADERS, timeout=15)
        r.raise_for_status()
        result = r.json()
        marker = "ALERT" if result.get("alert_raised") else "ok"
        log.info(f"telemetry sent | threat_score={result.get('threat_score')} | {marker}")
    except requests.RequestException as e:
        # NFR11 Fault Tolerance: never crash the agent on a network/DB hiccup.
        log.warning(f"Telemetry POST failed (will retry next cycle): {e}")


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def collection_cycle():
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "agent_id": AGENT_ID,
        "timestamp": now,
        "cpu": collect_cpu(),
        "memory": collect_memory(),
        "disks": collect_disks(),
        "network": collect_network(),
        "processes": collect_processes(),
        "file_events": flush_file_events(),
        "system_events": collect_system_events(),
    }
    send_telemetry(payload)


def main():
    log.info(f"ShadowPulse Agent starting | agent_id={AGENT_ID} | backend={BACKEND_URL}")
    register_agent()

    observer = start_file_watcher()
    threading.Thread(target=send_heartbeat_loop, daemon=True).start()

    try:
        while True:
            start = time.time()
            collection_cycle()
            elapsed = time.time() - start
            time.sleep(max(0.0, COLLECTION_INTERVAL_SECONDS - elapsed))
    except KeyboardInterrupt:
        log.info("Shutting down agent...")
    finally:
        observer.stop()
        observer.join()


if __name__ == "__main__":
    main()
