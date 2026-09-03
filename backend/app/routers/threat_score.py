from fastapi import APIRouter, Query
from app.database import get_db
from app.ml.engine import severity_for_score

router = APIRouter(prefix="/api", tags=["Threat Intelligence"])


@router.get("/threat-score")
async def get_threat_score(agent_id: str = Query(...)):
    """GET /api/threat-score — get current threat score + severity band."""
    db = get_db()
    latest = await db.anomaly_scores.find_one({"agent_id": agent_id}, {"_id": 0}, sort=[("timestamp", -1)])
    if not latest:
        return {"threat_score": 0, "severity": "Low", "timestamp": None}
    return {
        "threat_score": latest["threat_score"],
        "severity": severity_for_score(latest["threat_score"]),
        "is_anomaly": latest["is_anomaly"],
        "contributing_features": latest.get("details", {}).get("contributing_features", []),
        "timestamp": latest["timestamp"],
    }
