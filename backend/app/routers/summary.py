import asyncio

from fastapi import APIRouter, Query
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.services.threat_scoring import _generate_suggestions

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/summary")
async def get_summary(agent_id: str = Query(...)):
    """GET /api/summary — get overall system summary for the dashboard header."""
    db = get_db()

    agent = await db.agents.find_one({"agent_id": agent_id}, {"_id": 0})
    latest_cpu = await db.cpu_metrics.find_one({"agent_id": agent_id}, sort=[("timestamp", -1)])
    latest_mem = await db.memory_metrics.find_one({"agent_id": agent_id}, sort=[("timestamp", -1)])
    latest_disk = await db.disk_metrics.find_one({"agent_id": agent_id}, sort=[("timestamp", -1)])
    latest_network = await db.network_metrics.find_one({"agent_id": agent_id}, {"_id": 0}, sort=[("timestamp", -1)])
    latest_score = await db.anomaly_scores.find_one({"agent_id": agent_id}, sort=[("timestamp", -1)])

    since_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    open_alerts = await db.alerts.count_documents({"agent_id": agent_id, "status": "Open"})
    alerts_24h = await db.alerts.count_documents({"agent_id": agent_id, "created_at": {"$gte": since_24h}})
    anomalies_24h = await db.anomaly_scores.count_documents(
        {"agent_id": agent_id, "is_anomaly": True, "timestamp": {"$gte": since_24h}}
    )
    telemetry_records = sum(await asyncio.gather(
        db.cpu_metrics.count_documents({"agent_id": agent_id}),
        db.memory_metrics.count_documents({"agent_id": agent_id}),
        db.disk_metrics.count_documents({"agent_id": agent_id}),
        db.network_metrics.count_documents({"agent_id": agent_id}),
        db.process_events.count_documents({"agent_id": agent_id}),
        db.file_events.count_documents({"agent_id": agent_id}),
        db.system_events.count_documents({"agent_id": agent_id}),
    ))
    process_count = await db.process_events.count_documents({"agent_id": agent_id})

    return {
        "agent": agent,
        "system_health": "critical" if open_alerts > 0 and latest_score and latest_score["threat_score"] >= 91
        else ("warning" if open_alerts > 0 else "healthy"),
        "cpu_usage_percent": latest_cpu["cpu_usage_percent"] if latest_cpu else None,
        "memory_used_percent": latest_mem["used_percent"] if latest_mem else None,
        "disk_used_percent": latest_disk["used_percent"] if latest_disk else None,
        "network": latest_network,
        "process_count": process_count,
        "telemetry_records": telemetry_records,
        "current_threat_score": latest_score["threat_score"] if latest_score else 0,
        "open_alerts": open_alerts,
        "alerts_last_24h": alerts_24h,
        "anomalies_last_24h": anomalies_24h,
        "suggestions": (
            latest_score.get("details", {}).get("suggestions")
            or _generate_suggestions(latest_score.get("details", {}).get("contributing_features", []))
        ) if latest_score else [],
        "contributing_features": latest_score.get("details", {}).get("contributing_features", []) if latest_score else [],
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }
