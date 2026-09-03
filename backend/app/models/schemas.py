"""
Pydantic models mirroring the ShadowPulse ERD (DATABASE_DESIGN.png):
Users, Systems, Agents, *_Metrics, *_Events, ML_Models, Anomaly_Scores, Alerts.
These are used both for request validation (agent ingest) and response shaping.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Core entities
# ---------------------------------------------------------------------------

class AgentRegister(BaseModel):
    agent_id: str
    system_hostname: str
    os_type: str = "Windows"
    os_version: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    agent_version: str = "1.0.0"


class AgentHeartbeat(BaseModel):
    agent_id: str
    status: str = "online"


# ---------------------------------------------------------------------------
# Telemetry payload — what the agent POSTs every collection cycle
# ---------------------------------------------------------------------------

class CPUMetric(BaseModel):
    cpu_usage_percent: float
    core_usage: Optional[list[float]] = None
    load_average_1m: Optional[float] = None
    load_average_5m: Optional[float] = None
    load_average_15m: Optional[float] = None
    cpu_temperature: Optional[float] = None
    cores: Optional[int] = None


class MemoryMetric(BaseModel):
    total_memory: int
    used_memory: int
    free_memory: int
    used_percent: float
    swap_total: Optional[int] = 0
    swap_used: Optional[int] = 0
    swap_percent: Optional[float] = 0


class DiskMetric(BaseModel):
    disk_name: str
    total_space: int
    used_space: int
    free_space: int
    used_percent: float
    read_bytes: Optional[int] = 0
    write_bytes: Optional[int] = 0
    disk_temperature: Optional[float] = None


class NetworkMetric(BaseModel):
    bytes_sent: int
    bytes_received: int
    packets_sent: int
    packets_received: int
    active_connections: int
    network_speed: Optional[float] = None
    interface: Optional[str] = "default"


class ProcessEvent(BaseModel):
    pid: int
    ppid: Optional[int] = None
    process_name: str
    command_line: Optional[str] = None
    user: Optional[str] = None
    cpu_percent: Optional[float] = 0
    memory_percent: Optional[float] = 0
    memory_mb: Optional[float] = 0
    threads: Optional[int] = 0
    status: Optional[str] = "running"
    event_type: str = "running"  # created | terminated | running
    created_by: Optional[str] = None


class FileEvent(BaseModel):
    event_type: str  # created | modified | deleted | renamed
    file_path: str
    file_size: Optional[int] = None
    file_extension: Optional[str] = None
    hash: Optional[str] = None
    user: Optional[str] = None


class SystemEvent(BaseModel):
    event_type: str
    event_source: Optional[str] = None
    event_id_code: Optional[int] = None
    level: Optional[str] = "info"
    message: Optional[str] = None


class TelemetryPayload(BaseModel):
    """Single envelope the agent posts on every collection cycle."""
    agent_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    cpu: Optional[CPUMetric] = None
    memory: Optional[MemoryMetric] = None
    disks: list[DiskMetric] = Field(default_factory=list)
    network: Optional[NetworkMetric] = None
    processes: list[ProcessEvent] = Field(default_factory=list)
    file_events: list[FileEvent] = Field(default_factory=list)
    system_events: list[SystemEvent] = Field(default_factory=list)
    synthetic_test: bool = False


# ---------------------------------------------------------------------------
# ML / Threat entities
# ---------------------------------------------------------------------------

class AnomalyScoreOut(BaseModel):
    model_config = {"protected_namespaces": ()}

    agent_id: str
    model_id: Optional[str] = None
    timestamp: datetime
    anomaly_score: float
    threat_score: float
    is_anomaly: bool
    details: dict[str, Any] = Field(default_factory=dict)


class AlertOut(BaseModel):
    alert_id: str
    agent_id: str
    alert_type: str
    severity: str
    title: str
    description: str
    status: str = "Open"
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    threat_score: Optional[float] = None


class AlertAck(BaseModel):
    alert_id: str
    status: str = "Acknowledged"  # Acknowledged | Resolved
    resolved_by: Optional[str] = None
