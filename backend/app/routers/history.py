import asyncio

from fastapi import APIRouter, Query
from datetime import datetime, timezone, timedelta

from app.database import get_db

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("/metrics")
async def get_metrics_history(
    agent_id: str = Query(...),
    hours: int = Query(24, le=24 * 30),
    limit: int = Query(2000, le=10000),
):
    """GET /api/history/metrics — get historical metrics for trend charts."""
    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    query = {"agent_id": agent_id, "timestamp": {"$gte": since}}

    async def read(collection):
        return await collection.find(query, {"_id": 0}).sort("timestamp", 1).to_list(length=limit)

    cpu, memory, network, threat = await asyncio.gather(
        read(db.cpu_metrics),
        read(db.memory_metrics),
        read(db.network_metrics),
        read(db.anomaly_scores),
    )

    return {"cpu": cpu, "memory": memory, "network": network, "threat_scores": threat, "window_hours": hours}


@router.get("/alerts")
async def get_alerts_history(
    agent_id: str = Query(...),
    days: int = Query(30, le=365),
):
    """GET /api/history/alerts — get historical alerts."""
    db = get_db()
    since = datetime.now(timezone.utc) - timedelta(days=days)
    alerts = []
    async for a in db.alerts.find(
        {"agent_id": agent_id, "created_at": {"$gte": since}}, {"_id": 0}
    ).sort("created_at", -1):
        alerts.append(a)
    return {"alerts": alerts, "count": len(alerts), "window_days": days}
