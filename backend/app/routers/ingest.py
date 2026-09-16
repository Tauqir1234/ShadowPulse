"""
Ingest endpoint the ShadowPulse Agent posts to on every collection cycle.
Writes raw telemetry into its respective collections, derives a behavioral
feature vector, and hands it to the threat scoring service.
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone

from app.database import get_db
from app.core.security import verify_agent_key
from app.models.schemas import TelemetryPayload, AgentRegister, AgentHeartbeat
from app.services.threat_scoring import compute_and_persist

router = APIRouter(prefix="/api/agent", tags=["Agent Ingest"])


@router.post("/register")
async def register_agent(payload: AgentRegister, _=Depends(verify_agent_key)):
    db = get_db()
    await db.agents.update_one(
        {"agent_id": payload.agent_id},
        {"$set": {
            **payload.model_dump(),
            "installed_at": datetime.now(timezone.utc),
            "last_heartbeat": datetime.now(timezone.utc),
            "status": "online",
        }},
        upsert=True,
    )
    return {"message": "Agent registered", "agent_id": payload.agent_id}


@router.post("/heartbeat")
async def heartbeat(payload: AgentHeartbeat, _=Depends(verify_agent_key)):
    db = get_db()
    await db.agents.update_one(
        {"agent_id": payload.agent_id},
        {"$set": {"status": payload.status, "last_heartbeat": datetime.now(timezone.utc)}},
    )
    return {"message": "ok"}


@router.post("/telemetry")
async def ingest_telemetry(payload: TelemetryPayload, _=Depends(verify_agent_key)):
    db = get_db()
    ts = payload.timestamp
    agent_id = payload.agent_id

    if payload.cpu:
        await db.cpu_metrics.insert_one({"agent_id": agent_id, "timestamp": ts, **payload.cpu.model_dump()})
    if payload.memory:
        await db.memory_metrics.insert_one({"agent_id": agent_id, "timestamp": ts, **payload.memory.model_dump()})
    for disk in payload.disks:
        await db.disk_metrics.insert_one({"agent_id": agent_id, "timestamp": ts, **disk.model_dump()})
    if payload.network:
        await db.network_metrics.insert_one({"agent_id": agent_id, "timestamp": ts, **payload.network.model_dump()})
    for proc in payload.processes:
        await db.process_events.insert_one({"agent_id": agent_id, "timestamp": ts, **proc.model_dump()})
    for fe in payload.file_events:
        await db.file_events.insert_one({"agent_id": agent_id, "timestamp": ts, **fe.model_dump()})
    for se in payload.system_events:
        await db.system_events.insert_one({"agent_id": agent_id, "timestamp": ts, **se.model_dump()})

    await db.agents.update_one({"agent_id": agent_id}, {"$set": {"last_heartbeat": ts, "status": "online"}})

    # --- Build the behavioral feature vector for this cycle ---
    disk_agg = payload.disks[0] if payload.disks else None
    feature_vector = {
        "cpu_usage_percent": payload.cpu.cpu_usage_percent if payload.cpu else 0,
        "memory_used_percent": payload.memory.used_percent if payload.memory else 0,
        "disk_used_percent": disk_agg.used_percent if disk_agg else 0,
        "disk_io_rate": (disk_agg.read_bytes + disk_agg.write_bytes) if disk_agg else 0,
        "network_bytes_rate": (payload.network.bytes_sent + payload.network.bytes_received) if payload.network else 0,
        "active_connections": payload.network.active_connections if payload.network else 0,
        "process_count": len(payload.processes),
        "new_process_rate": sum(1 for p in payload.processes if p.event_type == "created"),
        "file_event_rate": len(payload.file_events),
        "system_event_rate": len(payload.system_events),
    }

    result = await compute_and_persist(
        agent_id,
        feature_vector,
        raw_context={"timestamp": ts, "synthetic": payload.synthetic_test},
        force_anomaly=payload.synthetic_test,
    )

    open_alerts = await db.alerts.count_documents({"agent_id": agent_id, "status": "Open"})
    
    from app.websocket_manager import manager
    await manager.broadcast(agent_id, {
        "cpu": {"timestamp": ts, **payload.cpu.model_dump()} if payload.cpu else None,
        "memory": {"timestamp": ts, **payload.memory.model_dump()} if payload.memory else None,
        "network": {"timestamp": ts, **payload.network.model_dump()} if payload.network else None,
        "disk": [{"timestamp": ts, **d.model_dump()} for d in payload.disks],
        "threat": result["score"],
        "processes": [{"timestamp": ts, **p.model_dump()} for p in payload.processes],
        "open_alerts": open_alerts,
        "timestamp": ts,
    })

    return {
        "message": "Telemetry stored",
        "threat_score": result["score"]["threat_score"],
        "is_anomaly": result["score"]["is_anomaly"],
        "alert_raised": result["alert"] is not None,
    }
