"""
Bridges raw telemetry -> feature vector -> ThreatEngine -> anomaly_scores
collection -> alert generation. This is called once per ingest cycle
from routers/ingest.py.
"""
from __future__ import annotations
from datetime import datetime, timezone
import uuid

from app.config import settings
from app.ml.engine import threat_engine
from app.database import get_db


async def compute_and_persist(agent_id: str, feature_vector: dict, raw_context: dict, force_anomaly: bool = False) -> dict:
    db = get_db()
    result = threat_engine.score(feature_vector)
    if force_anomaly:
        import random
        result.threat_score = round(random.uniform(75.0, 90.0), 1)
        result.is_anomaly = True
        result.severity = "Critical"

    score_doc = {
        "score_id": str(uuid.uuid4()),
        "agent_id": agent_id,
        "model_id": "isolation_forest_shadowpulse",
        "timestamp": raw_context.get("timestamp", datetime.now(timezone.utc).isoformat()),
        "anomaly_score": result.anomaly_score,
        "threat_score": result.threat_score,
        "is_anomaly": result.is_anomaly,
        "details": {
            "severity": result.severity,
            "contributing_features": result.contributing_features,
            "suggestions": _generate_suggestions(result.contributing_features),
            "features": feature_vector,
        },
    }
    await db.anomaly_scores.insert_one(score_doc)
    score_doc.pop("_id", None)

    alert_doc = None
    if result.threat_score >= settings.THREAT_THRESHOLD_ALERT:
        alert_doc = await _raise_alert(db, agent_id, result, raw_context, feature_vector, score_doc["score_id"])
        if alert_doc:
            alert_doc.pop("_id", None)

    print("score_doc:", score_doc)
    print("alert_doc:", alert_doc)
    return {"score": score_doc, "alert": alert_doc}


async def _raise_alert(db, agent_id: str, result, raw_context: dict, feature_vector: dict, score_id: str | None = None) -> dict:
    reasons = ", ".join(_humanize(f) for f in result.contributing_features) or "multiple behavioral indicators"
    alert_doc = {
        "alert_id": str(uuid.uuid4()),
        "agent_id": agent_id,
        "score_id": score_id,
        "alert_type": "Behavior",
        "severity": result.severity,
        "threshold": settings.THREAT_THRESHOLD_ALERT,
        "title": f"{result.severity} threat score ({result.threat_score:.0f}/100)",
        "description": f"Suspicious behavior detected: {reasons}.",
        "reasoning": _generate_reasoning(feature_vector, result.contributing_features),
        "status": "Open",
        "threat_score": result.threat_score,
        "suggestions": _generate_suggestions(result.contributing_features),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "resolved_at": None,
        "resolved_by": None,
    }
    await db.alerts.insert_one(alert_doc)
    return alert_doc


def _generate_reasoning(features: dict, contributing: list[str]) -> str:
    if not threat_engine.scaler or not contributing:
        return "Reasoning unavailable."

    from app.ml.engine import FEATURE_NAMES

    lines = ["Anomaly triggered by significant deviations in:"]
    for feat in contributing:
        if feat in FEATURE_NAMES:
            idx = FEATURE_NAMES.index(feat)
            mean_val = threat_engine.scaler.mean_[idx]
            actual_val = features.get(feat, 0)
            
            if "bytes" in feat or "io_rate" in feat:
                act_str = f"{actual_val/1024/1024:.2f} MB/s"
                mean_str = f"{mean_val/1024/1024:.2f} MB/s"
            elif "percent" in feat:
                act_str = f"{actual_val:.1f}%"
                mean_str = f"{mean_val:.1f}%"
            else:
                act_str = f"{actual_val:.0f}"
                mean_str = f"{mean_val:.0f}"
                
            context = ""
            if "cpu" in feat: context = " (Potential crypto-mining or ransomware)"
            elif "active_connections" in feat: context = " (Potential botnet, port scan, or C2 comms)"
            elif "file_event" in feat: context = " (Classic indicator of ransomware)"
            elif "process_rate" in feat or "process_count" in feat: context = " (Potential rapid malware execution)"
            elif "network" in feat: context = " (Potential data exfiltration)"
                
            lines.append(f"- {_humanize(feat)}: recorded {act_str} (normal baseline is ~{mean_str}){context}")

    lines.append("\nRecommended Actions:")
    for s in _generate_suggestions(contributing):
        lines.append(f"- {s}")

    return "\n".join(lines)


def _generate_suggestions(features: list[str]) -> list[str]:
    suggestions = []
    for f in features:
        if "cpu" in f: suggestions.append("Run a full anti-virus scan and kill any unrecognized high-CPU processes.")
        elif "memory" in f: suggestions.append("Check Task Manager/Activity Monitor and terminate unknown memory-heavy applications.")
        elif "active_connections" in f or "network" in f: suggestions.append("Temporarily isolate the machine from the network (disable Wi-Fi/Ethernet) and check for C2 traffic.")
        elif "process" in f: suggestions.append("Audit recently spawned processes and block unauthorized executables via policy.")
        elif "file" in f: suggestions.append("Immediately revoke file write permissions for suspicious processes and check for encrypted files.")
    if not suggestions:
        suggestions.append("Isolate the endpoint and monitor system behavior closely.")
    
    # Deduplicate in case multiple features trigger the same suggestion
    return list(dict.fromkeys(suggestions))


def _humanize(feature_name: str) -> str:
    mapping = {
        "cpu_usage_percent": "abnormal CPU usage",
        "memory_used_percent": "abnormal memory usage",
        "disk_used_percent": "unusual disk utilization",
        "disk_io_rate": "unusual disk I/O activity",
        "network_bytes_rate": "unusual network traffic volume",
        "active_connections": "unusual number of active connections",
        "process_count": "abnormal process count",
        "new_process_rate": "unusual rate of new processes",
        "file_event_rate": "unusual file-system activity",
        "system_event_rate": "unusual system event volume",
    }
    return mapping.get(feature_name, feature_name)
