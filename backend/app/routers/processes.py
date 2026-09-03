from fastapi import APIRouter, Query
from app.database import get_db

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/processes")
async def get_processes(agent_id: str = Query(...), limit: int = Query(1000, le=2000)):
    """GET /api/processes — get running processes (most recent snapshot)."""
    db = get_db()
    latest = await db.process_events.find_one({"agent_id": agent_id}, sort=[("timestamp", -1)])
    if not latest:
        return {"processes": [], "count": 0}

    processes = []
    async for p in db.process_events.find(
        {"agent_id": agent_id, "timestamp": latest["timestamp"]}, {"_id": 0}
    ).sort("cpu_percent", -1).limit(limit):
        processes.append(p)

    return {"processes": processes, "count": len(processes), "snapshot_time": latest["timestamp"]}
