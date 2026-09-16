from fastapi import APIRouter, Query, HTTPException
from datetime import datetime, timezone

from app.database import get_db
from app.models.schemas import AlertAck

router = APIRouter(prefix="/api", tags=["Alerts"])


@router.get("/alerts")
async def get_alerts(
    agent_id: str = Query(...),
    status: str | None = Query(None, description="Open | Acknowledged | Resolved"),
    limit: int = Query(50, le=500),
):
    """GET /api/alerts — get recent alerts."""
    db = get_db()
    q = {"agent_id": agent_id}
    if status:
        q["status"] = status

    alerts = []
    async for a in db.alerts.find(q, {"_id": 0}).sort("created_at", -1).limit(limit):
        alerts.append(a)
    return {"alerts": alerts, "count": len(alerts)}


@router.put("/alerts/ack")
async def acknowledge_alert(payload: AlertAck):
    """PUT /api/alerts/ack — acknowledge (or resolve) an alert."""
    db = get_db()
    update = {"status": payload.status, "updated_at": datetime.now(timezone.utc)}
    if payload.status == "Resolved":
        update["resolved_at"] = datetime.now(timezone.utc)
        update["resolved_by"] = payload.resolved_by

    result = await db.alerts.update_one({"alert_id": payload.alert_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": f"Alert {payload.alert_id} marked as {payload.status}"}


@router.delete("/alerts")
async def clear_alerts(agent_id: str = Query(...)):
    """DELETE /api/alerts — permanently delete all alert history for an agent."""
    db = get_db()
    result = await db.alerts.delete_many({"agent_id": agent_id})
    return {"message": f"Cleared {result.deleted_count} alert(s) for agent {agent_id}", "deleted": result.deleted_count}
