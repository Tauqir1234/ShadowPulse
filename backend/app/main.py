"""
ShadowPulse — FastAPI backend entrypoint.
Wires together MongoDB lifecycle, REST routers, and a WebSocket channel
that pushes live metric/alert updates to the React dashboard.
"""
import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, get_db
from app.routers import (
    health, auth, ingest, summary, metrics, processes,
    network, alerts, anomalies, threat_score, history, data, integrity
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Based Signature-Free Behavioural Intrusion Detection System — REST API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (health, auth, ingest, summary, metrics, processes, network, alerts, anomalies, threat_score, history, data, integrity):
    app.include_router(r.router)


# ---------------------------------------------------------------------------
# WebSocket: real-time push channel (FR14/ Module 7 "Real-time Updates")
# ---------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, agent_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(agent_id, []).append(ws)

    def disconnect(self, agent_id: str, ws: WebSocket):
        if agent_id in self.active and ws in self.active[agent_id]:
            self.active[agent_id].remove(ws)

    async def broadcast(self, agent_id: str, message: dict):
        for ws in list(self.active.get(agent_id, [])):
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                self.disconnect(agent_id, ws)


manager = ConnectionManager()


@app.websocket("/ws/{agent_id}")
async def websocket_endpoint(websocket: WebSocket, agent_id: str):
    """Dashboard connects here; receives a snapshot every ~3s so charts and
    the threat gauge update live without polling."""
    await manager.connect(agent_id, websocket)
    db = get_db()
    try:
        while True:
            latest_cpu = await db.cpu_metrics.find_one({"agent_id": agent_id}, {"_id": 0}, sort=[("timestamp", -1)])
            latest_mem = await db.memory_metrics.find_one({"agent_id": agent_id}, {"_id": 0}, sort=[("timestamp", -1)])
            latest_net = await db.network_metrics.find_one({"agent_id": agent_id}, {"_id": 0}, sort=[("timestamp", -1)])
            latest_score = await db.anomaly_scores.find_one({"agent_id": agent_id}, {"_id": 0}, sort=[("timestamp", -1)])
            latest_process = await db.process_events.find_one({"agent_id": agent_id}, {"_id": 0}, sort=[("timestamp", -1)])
            processes = []
            if latest_process:
                async for process in db.process_events.find(
                    {"agent_id": agent_id, "timestamp": latest_process["timestamp"]},
                    {"_id": 0},
                ).sort("cpu_percent", -1).limit(1000):
                    processes.append(process)
            open_alerts = await db.alerts.count_documents({"agent_id": agent_id, "status": "Open"})

            await websocket.send_text(json.dumps({
                "cpu": latest_cpu,
                "memory": latest_mem,
                "network": latest_net,
                "threat": latest_score,
                "processes": processes,
                "open_alerts": open_alerts,
            }, default=str))
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        manager.disconnect(agent_id, websocket)


@app.get("/")
async def root():
    return {"message": "ShadowPulse API is running. See /docs for the OpenAPI schema."}
