from datetime import datetime, timezone

import joblib
from fastapi import APIRouter, HTTPException, Query
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from pydantic import BaseModel

from app.database import get_db
from app.config import settings
from app.ml.engine import FEATURE_NAMES, threat_engine
from app.ml.train import build_feature_matrix

router = APIRouter(prefix="/api", tags=["Threat Intelligence"])


@router.get("/anomalies")
async def get_anomalies(agent_id: str = Query(...), limit: int = Query(50, le=500)):
    """GET /api/anomalies — get detected anomalies (is_anomaly = true)."""
    db = get_db()
    anomalies = []
    async for a in db.anomaly_scores.find(
        {"agent_id": agent_id, "is_anomaly": True}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit):
        anomalies.append(a)
    return {"anomalies": anomalies, "count": len(anomalies)}


class TriggerAnomalyRequest(BaseModel):
    agent_id: str


class RetrainRequest(BaseModel):
    agent_id: str
    days: int = 7


@router.post("/anomalies/retrain")
async def retrain_anomaly_model(req: RetrainRequest):
    """Learn the selected agent's normal baseline and hot-reload the scorer."""
    if req.days < 1 or req.days > 30:
        raise HTTPException(status_code=400, detail="days must be between 1 and 30")

    from datetime import timedelta

    try:
        matrix = await build_feature_matrix(
            req.agent_id,
            datetime.now(timezone.utc) - timedelta(days=req.days),
        )
    except SystemExit as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    if len(matrix) < 10:
        raise HTTPException(status_code=400, detail="At least 10 telemetry samples are required to learn a baseline")

    scaler = StandardScaler().fit(matrix)
    model = IsolationForest(
        n_estimators=300,
        contamination=settings.ANOMALY_CONTAMINATION,
        random_state=42,
        n_jobs=-1,
    ).fit(scaler.transform(matrix))
    joblib.dump(model, settings.MODEL_PATH)
    joblib.dump(scaler, settings.SCALER_PATH)
    threat_engine.reload()

    await get_db().ml_models.insert_one({
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
            "training_samples": int(len(matrix)),
            "training_window_days": req.days,
        },
        "created_at": datetime.now(timezone.utc),
    })
    return {"message": "Baseline model learned and loaded", "training_samples": int(len(matrix)), "days": req.days}

@router.post("/anomalies/trigger")
async def trigger_anomaly(req: TriggerAnomalyRequest):
    """Simulate a severe anomaly by running the anomaly_test.py logic."""
    from app.routers.ingest import ingest_telemetry
    from app.models.schemas import TelemetryPayload, CPUMetric, MemoryMetric, NetworkMetric, ProcessEvent, FileEvent, SystemEvent, DiskMetric
    import asyncio
    from datetime import datetime, timezone

    def make_payload(cpu, connections, process_count, file_events, synthetic_test=False):
        return TelemetryPayload(
            agent_id=req.agent_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            synthetic_test=synthetic_test,
            cpu=CPUMetric(cpu_usage_percent=cpu, cores=8),
            memory=MemoryMetric(total_memory=16_000_000_000, used_memory=7_200_000_000, free_memory=8_800_000_000, used_percent=45),
            network=NetworkMetric(bytes_sent=1500000, bytes_received=1500000, packets_sent=5000, packets_received=5000, active_connections=connections, interface="simulation"),
            processes=[ProcessEvent(pid=90000+i, process_name="shadowpulse-test", cpu_percent=0, memory_percent=0, event_type="created" if i else "running") for i in range(process_count)],
            file_events=[FileEvent(event_type="created", file_path=f"test-event-{i}.tmp", file_size=0, file_extension="tmp") for i in range(file_events)],
            system_events=[SystemEvent(event_type="shadowpulse_test_signal", event_source="anomaly_test.py", level="info", message="Benign synthetic detection test event")],
            disks=[DiskMetric(disk_name="C:", total_space=1000, used_space=500, free_space=500, used_percent=50, read_bytes=0, write_bytes=0)]
        )

    try:
        # 1. Normal sample
        normal_payload = make_payload(cpu=20, connections=15, process_count=8, file_events=2)
        await ingest_telemetry(normal_payload)
        
        await asyncio.sleep(1)
        
        # 2. Synthetic anomaly sample
        anomaly_payload = make_payload(cpu=99, connections=500, process_count=80, file_events=250, synthetic_test=True)
        result = await ingest_telemetry(anomaly_payload)
        
        # Return the final anomaly score
        return {"message": "Anomaly triggered", "result": {"score": {"threat_score": result["threat_score"]}}}
    except Exception as e:
        return {"message": f"Failed to trigger anomaly: {str(e)}", "result": None}

@router.get("/anomalies/baseline")
async def get_model_baseline():
    """GET /api/anomalies/baseline — returns the learned mean and standard deviation for each feature."""
    if not threat_engine.scaler:
        raise HTTPException(status_code=404, detail="Model baseline not found (scaler missing).")
    
    import numpy as np
    
    mean_array = threat_engine.scaler.mean_
    var_array = threat_engine.scaler.var_
    std_array = np.sqrt(var_array)
    
    baseline_features = []
    for i, feature_name in enumerate(FEATURE_NAMES):
        baseline_features.append({
            "feature": feature_name,
            "mean": float(mean_array[i]),
            "std": float(std_array[i])
        })
        
    return {"baseline": baseline_features}

@router.get("/ml/diagnostics")
async def get_ml_diagnostics():
    """GET /api/ml/diagnostics — returns real statistics about the currently loaded Isolation Forest model."""
    db = get_db()
    model = await db.ml_models.find_one({"status": "active"}, sort=[("created_at", -1)])
    if not model:
        return {"status": "uninitialized", "config": {}}
    
    # We remove the _id so it can be serialized easily
    model.pop("_id", None)
    return {"status": "active", "config": model}
