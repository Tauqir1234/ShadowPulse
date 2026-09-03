"""
MongoDB connection layer using Motor (async driver).
Collections map 1:1 to the ERD in DATABASE_DESIGN.png:
roles, users, systems, agents, cpu_metrics, memory_metrics, disk_metrics,
network_metrics, process_events, file_events, system_events,
ml_models, anomaly_scores, alerts.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings


class Database:
    client: AsyncIOMotorClient | None = None
    db = None


database = Database()


async def connect_to_mongo():
    database.client = AsyncIOMotorClient(settings.MONGO_URI, tz_aware=True)
    database.db = database.client[settings.MONGO_DB_NAME]
    await ensure_indexes()


async def close_mongo_connection():
    if database.client:
        database.client.close()


async def ensure_indexes():
    """Create indexes that keep dashboard queries fast at scale."""
    db = database.db
    await db.cpu_metrics.create_index([("agent_id", 1), ("timestamp", -1)])
    await db.memory_metrics.create_index([("agent_id", 1), ("timestamp", -1)])
    await db.disk_metrics.create_index([("agent_id", 1), ("timestamp", -1)])
    await db.network_metrics.create_index([("agent_id", 1), ("timestamp", -1)])
    await db.process_events.create_index([("agent_id", 1), ("timestamp", -1)])
    await db.file_events.create_index([("agent_id", 1), ("timestamp", -1)])
    await db.system_events.create_index([("agent_id", 1), ("timestamp", -1)])
    await db.anomaly_scores.create_index([("agent_id", 1), ("timestamp", -1)])
    await db.alerts.create_index([("agent_id", 1), ("created_at", -1)])
    await db.alerts.create_index([("status", 1)])
    await db.agents.create_index("agent_id", unique=True)
    await db.users.create_index("username", unique=True)


def get_db():
    """FastAPI dependency to access the active database handle."""
    return database.db
