import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['shadowpulse']
    await db.cpu_metrics.delete_many({})
    await db.memory_metrics.delete_many({})
    await db.disk_metrics.delete_many({})
    await db.network_metrics.delete_many({})
    await db.alerts.delete_many({})
    await db.anomaly_scores.delete_many({})
    print('Cleared telemetry, alerts, and anomaly data')

asyncio.run(main())
