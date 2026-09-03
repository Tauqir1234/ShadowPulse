"""
ShadowPulse AI/ML Engine
------------------------
Wraps a Scikit-learn Isolation Forest model that learns the "normal"
behavioural baseline of a machine from telemetry features, then scores
new feature vectors for anomalousness. Converts the raw anomaly score
into a 0-100 threat score with severity banding, matching the ranges
defined in the SRS / architecture diagram:

    Low       0 - 30
    Medium    31 - 60
    High      61 - 90
    Critical  91 - 100

The model is intentionally small and fast (CPU-only, sub-millisecond
inference) so it can run continuously alongside a lightweight agent.
"""
from __future__ import annotations
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.config import settings

FEATURE_NAMES = [
    "cpu_usage_percent",
    "memory_used_percent",
    "disk_used_percent",
    "disk_io_rate",
    "network_bytes_rate",
    "active_connections",
    "process_count",
    "new_process_rate",
    "file_event_rate",
    "system_event_rate",
]


def severity_for_score(score: float) -> str:
    if score >= 91:
        return "Critical"
    if score >= 61:
        return "High"
    if score >= 31:
        return "Medium"
    return "Low"


@dataclass
class ScoringResult:
    anomaly_score: float       # raw isolation forest score, higher = more anomalous
    threat_score: float        # normalized 0-100
    is_anomaly: bool
    severity: str
    contributing_features: list[str]


class ThreatEngine:
    """Loads (or lazily trains a bootstrap) Isolation Forest model and
    scores incoming behavioural feature vectors."""

    def __init__(self) -> None:
        self.model: IsolationForest | None = None
        self.scaler: StandardScaler | None = None
        self._load_or_bootstrap()

    # ------------------------------------------------------------------
    def _load_or_bootstrap(self) -> None:
        model_path = settings.MODEL_PATH
        scaler_path = settings.SCALER_PATH
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            self.model = joblib.load(model_path)
            self.scaler = joblib.load(scaler_path)
            return

        # Bootstrap: fit a rough baseline model on synthetic "normal"
        # traffic so the API is functional out of the box, before the
        # real train.py pipeline has been run against collected agent
        # telemetry. This is deliberately conservative and gets
        # replaced automatically once app/ml/train.py runs.
        rng = np.random.default_rng(42)
        synthetic_normal = np.column_stack([
            rng.normal(20, 8, 2000).clip(0, 100),     # cpu
            rng.normal(45, 10, 2000).clip(0, 100),    # memory
            rng.normal(55, 12, 2000).clip(0, 100),    # disk
            rng.normal(2_000_000, 800_000, 2000).clip(0),  # disk io
            rng.normal(500_000, 200_000, 2000).clip(0),    # net rate
            rng.normal(15, 6, 2000).clip(0),          # connections
            rng.normal(90, 20, 2000).clip(0),         # process count
            rng.normal(0.5, 0.4, 2000).clip(0),       # new process rate
            rng.normal(3, 2, 2000).clip(0),           # file event rate
            rng.normal(1, 1, 2000).clip(0),           # system event rate
        ])
        self.scaler = StandardScaler().fit(synthetic_normal)
        scaled = self.scaler.transform(synthetic_normal)
        self.model = IsolationForest(
            n_estimators=200,
            contamination=settings.ANOMALY_CONTAMINATION,
            random_state=42,
            n_jobs=-1,
        ).fit(scaled)
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)

    # ------------------------------------------------------------------
    def score(self, features: dict[str, float]) -> ScoringResult:
        vector = np.array([[features.get(name, 0.0) for name in FEATURE_NAMES]])
        scaled = self.scaler.transform(vector)

        # decision_function: higher = more normal. We invert so higher = more anomalous.
        raw = -self.model.decision_function(scaled)[0]
        prediction = self.model.predict(scaled)[0]  # -1 anomaly, 1 normal
        is_anomaly = prediction == -1

        # Normalize raw score (~ -0.2..0.5 typical range) into 0-100 threat score.
        threat_score = float(np.clip((raw + 0.2) / 0.7 * 100, 0, 100))

        contributing = self._top_contributing_features(vector[0])

        return ScoringResult(
            anomaly_score=round(float(raw), 4),
            threat_score=round(threat_score, 2),
            is_anomaly=bool(is_anomaly),
            severity=severity_for_score(threat_score),
            contributing_features=contributing,
        )

    # ------------------------------------------------------------------
    def _top_contributing_features(self, raw_vector: np.ndarray, top_k: int = 3) -> list[str]:
        """Cheap explainability: flag features furthest (in std-devs) from
        the learned mean, so alerts can say *why* something looks anomalous."""
        if self.scaler is None:
            return []
        standard_deviation = np.maximum(np.sqrt(self.scaler.var_), 1e-9)
        z_scores = (raw_vector - self.scaler.mean_) / standard_deviation
        order = np.argsort(-np.abs(z_scores))[:top_k]
        return [FEATURE_NAMES[i] for i in order if abs(z_scores[i]) > 1.5]

    # ------------------------------------------------------------------
    def reload(self) -> None:
        """Hot-reload the model after app/ml/train.py produces a new artifact."""
        self.model = joblib.load(settings.MODEL_PATH)
        self.scaler = joblib.load(settings.SCALER_PATH)


# Singleton used by the FastAPI app
threat_engine = ThreatEngine()
