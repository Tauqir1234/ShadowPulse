"""
ShadowPulse — Isolation Forest training pipeline.

Pulls historical telemetry for an agent from MongoDB, builds the
behavioural feature matrix (see engine.FEATURE_NAMES), fits a fresh
Isolation Forest + StandardScaler, and writes both artifacts to
app/ml/model_store/. Run this periodically (e.g. nightly via cron or
after a fresh multi-day baseline collection period) to keep the model
tuned to each machine's real "normal".

Usage:
    python -m app.ml.train --agent-id AGENT_123 --days 7
"""
from __future__ import annotations
import argparse
import asyncio
from datetime import datetime, timezone, timedelta

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, database
from app.ml.engine import FEATURE_NAMES


async def build_feature_matrix(agent_id: str, since: datetime) -> np.ndarray:
    db = database.db
    rows = []

    cpu_cursor = db.cpu_metrics.find({"agent_id": agent_id, "timestamp": {"$gte": since}})
    mem_cursor = db.memory_metrics.find({"agent_id": agent_id, "timestamp": {"$gte": since}})
    disk_cursor = db.disk_metrics.find({"agent_id": agent_id, "timestamp": {"$gte": since}})
    net_cursor = db.network_metrics.find({"agent_id": agent_id, "timestamp": {"$gte": since}})

    cpu_docs = {d["timestamp"]: d async for d in cpu_cursor}
    mem_docs = {d["timestamp"]: d async for d in mem_cursor}
    disk_docs = {d["timestamp"]: d async for d in disk_cursor}
    net_docs = {d["timestamp"]: d async for d in net_cursor}

    proc_count = await db.process_events.count_documents({"agent_id": agent_id, "timestamp": {"$gte": since}})
    file_count = await db.file_events.count_documents({"agent_id": agent_id, "timestamp": {"$gte": since}})
    sys_count = await db.system_events.count_documents({"agent_id": agent_id, "timestamp": {"$gte": since}})

    timestamps = sorted(set(cpu_docs) & set(mem_docs))
    for ts in timestamps:
        cpu = cpu_docs.get(ts, {})
        mem = mem_docs.get(ts, {})
        disk = disk_docs.get(ts, {})
        net = net_docs.get(ts, {})
        rows.append([
            cpu.get("cpu_usage_percent", 0),
            mem.get("used_percent", 0),
            disk.get("used_percent", 0),
            (disk.get("read_bytes", 0) + disk.get("write_bytes", 0)),
            (net.get("bytes_sent", 0) + net.get("bytes_received", 0)),
            net.get("active_connections", 0),
            proc_count,
            0,  # new_process_rate placeholder — refined by real event deltas
            file_count,
            sys_count,
        ])

    if not rows:
        raise SystemExit(
            f"No telemetry found for agent_id={agent_id} since {since}. "
            "Let the agent run longer to build a baseline before training."
        )
    return np.array(rows, dtype=float)


async def main(agent_id: str, days: int):
    await connect_to_mongo()
    since = datetime.now(timezone.utc) - timedelta(days=days)
    print(f"Building feature matrix for {agent_id} over last {days} day(s)...")
    X = await build_feature_matrix(agent_id, since)
    print(f"Training on {X.shape[0]} samples x {X.shape[1]} features")

    scaler = StandardScaler().fit(X)
    X_scaled = scaler.transform(X)

    model = IsolationForest(
        n_estimators=300,
        contamination=settings.ANOMALY_CONTAMINATION,
        random_state=42,
        n_jobs=-1,
    ).fit(X_scaled)

    joblib.dump(model, settings.MODEL_PATH)
    joblib.dump(scaler, settings.SCALER_PATH)

    await database.db.ml_models.insert_one({
        "model_name": "isolation_forest_shadowpulse",
        "model_type": "anomaly_detection",
        "algorithm": "IsolationForest",
        "version": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        "status": "active",
        "training_active": False,
        "trained_at": datetime.now(timezone.utc),
        "parameters": {
            "n_estimators": 300,
            "contamination": settings.ANOMALY_CONTAMINATION,
            "features": FEATURE_NAMES,
            "training_samples": int(X.shape[0]),
            "training_window_days": days,
        },
        "created_at": datetime.now(timezone.utc),
    })

    print(f"Model + scaler written to {settings.MODEL_PATH} / {settings.SCALER_PATH}")
    await close_mongo_connection()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train ShadowPulse Isolation Forest model")
    parser.add_argument("--agent-id", required=True, help="Agent to train the baseline from")
    parser.add_argument("--days", type=int, default=7, help="Lookback window in days")
    args = parser.parse_args()
    asyncio.run(main(args.agent_id, args.days))
