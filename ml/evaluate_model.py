"""
Offline evaluation of the Isolation Forest anomaly detector against the
synthetic dataset (or any CSV with the same schema + a `label` column).
Reports Precision, Recall, F1, False Alarm Rate, and ROC-AUC — the exact
metrics called out in shadowpulse_abstract.pdf's Performance Evaluation
Module, so the project has real numbers to show rather than only a
qualitative "it works" claim.

Usage:
    python ml/generate_synthetic_data.py
    python ml/evaluate_model.py
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix, classification_report,
)

from generate_synthetic_data import FEATURE_NAMES

DATA_PATH = "ml/synthetic_dataset.csv"
CONTAMINATION = 0.05


def main():
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURE_NAMES].values
    y_true = df["label"].values  # 0 = normal, 1 = attack (evaluation only)

    # Train Isolation Forest UNSUPERVISED (never sees y_true), same as production.
    scaler = StandardScaler().fit(X)
    X_scaled = scaler.transform(X)

    model = IsolationForest(n_estimators=300, contamination=CONTAMINATION, random_state=42, n_jobs=-1)
    model.fit(X_scaled)

    raw_scores = -model.decision_function(X_scaled)          # higher = more anomalous
    predictions = (model.predict(X_scaled) == -1).astype(int)  # 1 = flagged anomaly

    precision = precision_score(y_true, predictions, zero_division=0)
    recall = recall_score(y_true, predictions, zero_division=0)
    f1 = f1_score(y_true, predictions, zero_division=0)
    roc_auc = roc_auc_score(y_true, raw_scores)

    tn, fp, fn, tp = confusion_matrix(y_true, predictions).ravel()
    false_alarm_rate = fp / (fp + tn) if (fp + tn) else 0.0

    print("=" * 60)
    print("ShadowPulse — Isolation Forest Evaluation")
    print("=" * 60)
    print(f"Samples:            {len(df)}  ({y_true.sum()} attack / {(y_true==0).sum()} normal)")
    print(f"Precision:          {precision:.3f}")
    print(f"Recall:             {recall:.3f}")
    print(f"F1 Score:           {f1:.3f}")
    print(f"False Alarm Rate:   {false_alarm_rate:.3f}  ({fp} false positives / {fp+tn} normal samples)")
    print(f"ROC-AUC:            {roc_auc:.3f}")
    print("-" * 60)
    print(classification_report(y_true, predictions, target_names=["Normal", "Attack"]))


if __name__ == "__main__":
    main()
