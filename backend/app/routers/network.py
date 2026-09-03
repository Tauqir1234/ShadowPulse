from fastapi import APIRouter, Query
from app.database import get_db

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/network")
async def get_network(agent_id: str = Query(...), limit: int = Query(60, le=1000)):
    """GET /api/network — get recent network activity (for live throughput chart)."""
    db = get_db()
    points = []
    async for n in db.network_metrics.find({"agent_id": agent_id}, {"_id": 0}).sort("timestamp", -1).limit(limit):
        points.append(n)
    points.reverse()
    return {"points": points, "count": len(points)}
