import asyncio

from fastapi import APIRouter, Query
from app.database import get_db

router = APIRouter(prefix="/api/data", tags=["Data"])

@router.get("/agents")
async def get_agents():
    """Return registered agents, newest heartbeat first, for dashboard selection."""
    db = get_db()
    agents = await db.agents.find({}, {"_id": 0}).sort("last_heartbeat", -1).to_list(length=100)
    return {"agents": agents}

@router.get("/telemetry")
async def get_telemetry_data(
    agent_id: str = Query(None),
    limit: int = Query(100, le=1000)
):
    """GET /api/data/telemetry — get all raw telemetry data from mongodb."""
    db = get_db()
    
    query = {}
    if agent_id:
        query["agent_id"] = agent_id
        
    source_collections = [
        "cpu_metrics", "memory_metrics", "disk_metrics", "network_metrics",
        "process_events", "file_events", "system_events", "anomaly_scores",
    ]

    async def read_collection(name):
        rows = await db[name].find(query, {"_id": 0}).sort("timestamp", -1).to_list(length=limit)
        return [{"collection": name, **row} for row in rows]

    batches = await asyncio.gather(*(read_collection(name) for name in source_collections))
    data = sorted(
        [row for batch in batches for row in batch],
        key=lambda row: row.get("timestamp", ""),
        reverse=True,
    )[:limit]
        
    return {"data": data, "count": len(data)}


@router.get("/collections")
async def get_collections_data(
    agent_id: str = Query(None),
    limit: int = Query(100, le=500),
):
    """Return recent documents from every ShadowPulse MongoDB collection."""
    db = get_db()
    collection_names = sorted(
        name for name in await db.list_collection_names()
        if not name.startswith("system.")
    )
    query = {"agent_id": agent_id} if agent_id else {}
    collections = {}
    counts = {}

    for name in collection_names:
        collection = db[name]
        sort_field = "timestamp" if name not in {"agents", "users", "ml_models"} else "created_at"
        documents = await collection.find(query, {"_id": 0}).sort(sort_field, -1).to_list(length=limit)
        collections[name] = documents
        counts[name] = await collection.count_documents(query)

    return {"collections": collections, "counts": counts}
