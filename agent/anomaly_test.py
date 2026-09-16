"""Send harmless synthetic telemetry to exercise ShadowPulse detection.

This script does not create files, launch processes, scan ports, or perform
any malware-like action. It only posts unusual metric values and event
metadata through the same authenticated ingest endpoint as the agent.

Usage:
    python anomaly_test.py
"""
from __future__ import annotations

import os
import socket
import time
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

import uuid

BACKEND_URL = os.getenv("SHADOWPULSE_BACKEND_URL", "http://localhost:8000")
AGENT_KEY = os.getenv("SHADOWPULSE_AGENT_KEY", "CHANGE_ME_AGENT_SHARED_SECRET")
# Match the active agent's ID so the dashboard (which is already connected to it) sees the anomaly
AGENT_ID = os.getenv("SHADOWPULSE_AGENT_ID") or f"agent-{uuid.getnode():x}"
HEADERS = {"X-Agent-Key": AGENT_KEY, "Content-Type": "application/json"}


def telemetry(cpu: float, connections: int, process_count: int, file_events: int, synthetic_test: bool = False) -> dict:
    timestamp = datetime.now(timezone.utc).isoformat()
    return {
        "agent_id": AGENT_ID,
        "timestamp": timestamp,
        "synthetic_test": synthetic_test,
        "cpu": {"cpu_usage_percent": cpu, "cores": 8},
        "memory": {
            "total_memory": 16_000_000_000,
            "used_memory": 7_200_000_000,
            "free_memory": 8_800_000_000,
            "used_percent": 45,
        },
        "network": {
            "bytes_sent": 1_500_000,
            "bytes_received": 1_500_000,
            "packets_sent": 5000,
            "packets_received": 5000,
            "active_connections": connections,
            "interface": "simulation",
        },
        "processes": [
            {
                "pid": 90000 + index,
                "process_name": "shadowpulse-test-anomaly",
                "cpu_percent": 0,
                "memory_percent": 0,
                "event_type": "created" if index else "running",
            }
            for index in range(process_count)
        ],
        "file_events": [
            {
                "event_type": "created",
                "file_path": "[simulation-only]/test-event-{0}.tmp".format(index),
                "file_size": 0,
                "file_extension": "tmp",
            }
            for index in range(file_events)
        ],
        "system_events": [{
            "event_type": "shadowpulse_test_signal",
            "event_source": "anomaly_test.py",
            "level": "info",
            "message": "Benign synthetic detection test event",
        }],
    }


def post(path: str, payload: dict) -> dict:
    response = requests.post(f"{BACKEND_URL}{path}", json=payload, headers=HEADERS, timeout=15)
    response.raise_for_status()
    return response.json()


def main() -> None:
    post("/api/agent/register", {
        "agent_id": AGENT_ID,
        "system_hostname": "shadowpulse-test",
        "os_type": "simulation",
        "os_version": "safe-test",
        "agent_version": "test-1.0.0",
    })
    print(f"Registered safe test agent: {AGENT_ID}")

    normal = telemetry(cpu=20, connections=15, process_count=8, file_events=2)
    print("Normal sample:", post("/api/agent/telemetry", normal))
    time.sleep(1)

    anomaly = telemetry(cpu=99, connections=500, process_count=80, file_events=250, synthetic_test=True)
    print("Synthetic anomaly:", post("/api/agent/telemetry", anomaly))
    print(f"Open the dashboard and connect agent_id: {AGENT_ID}")


if __name__ == "__main__":
    main()