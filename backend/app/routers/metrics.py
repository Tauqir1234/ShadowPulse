from fastapi import APIRouter, Query
from app.database import get_db

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/metrics")
async def get_metrics(agent_id: str = Query(...)):
    """GET /api/metrics — get real-time system metrics (latest CPU/RAM/disk/network)."""
    db = get_db()
    cpu = await db.cpu_metrics.find_one({"agent_id": agent_id}, {"_id": 0}, sort=[("timestamp", -1)])
    memory = await db.memory_metrics.find_one({"agent_id": agent_id}, {"_id": 0}, sort=[("timestamp", -1)])
    network = await db.network_metrics.find_one({"agent_id": agent_id}, {"_id": 0}, sort=[("timestamp", -1)])

    disks = []
    async for d in db.disk_metrics.find({"agent_id": agent_id}, {"_id": 0}).sort("timestamp", -1).limit(10):
        disks.append(d)

    return {"cpu": cpu, "memory": memory, "network": network, "disks": disks}
