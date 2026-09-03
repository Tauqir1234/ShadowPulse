from fastapi import APIRouter, Query
from app.database import get_db

router = APIRouter(prefix="/api/integrity", tags=["Integrity"])

@router.get("/events")
async def get_integrity_events(
    agent_id: str = Query(...),
    limit: int = Query(50, le=500)
):
    """GET /api/integrity/events — get file system events."""
    db = get_db()
    
    events = []
    async for e in db.file_events.find({"agent_id": agent_id}, {"_id": 0}).sort("timestamp", -1).limit(limit):
        events.append(e)
        
    return {"events": events, "count": len(events)}
