"""
Generates synthetic "normal" and "attack-simulated" behavioural telemetry
so the Isolation Forest model and its evaluation metrics (Precision,
Recall, False Alarm Rate, ROC-AUC — see shadowpulse_abstract.pdf, section
"Performance Evaluation Module") can be exercised without waiting days
for a real baseline to accumulate.

Simulated attack patterns mirror the ones named in the abstract:
CPU Stress, Port Scan, Multiple Process Launch, File Creation Flood.

Output: ml/synthetic_dataset.csv with columns matching
backend/app/ml/engine.py::FEATURE_NAMES, plus a `label` column
(0 = normal, 1 = attack) for evaluation purposes only — the production
Isolation Forest itself trains unsupervised, without using this label.
"""
import numpy as np
import pandas as pd

FEATURE_NAMES = [
    "cpu_usage_percent", "memory_used_percent", "disk_used_percent",
    "disk_io_rate", "network_bytes_rate", "active_connections",
    "process_count", "new_process_rate", "file_event_rate", "system_event_rate",
]


def normal_traffic(n, rng):
    return pd.DataFrame({
        "cpu_usage_percent": rng.normal(20, 8, n).clip(0, 100),
        "memory_used_percent": rng.normal(45, 10, n).clip(0, 100),
        "disk_used_percent": rng.normal(55, 12, n).clip(0, 100),
        "disk_io_rate": rng.normal(2_000_000, 800_000, n).clip(0),
        "network_bytes_rate": rng.normal(500_000, 200_000, n).clip(0),
        "active_connections": rng.normal(15, 6, n).clip(0),
        "process_count": rng.normal(90, 20, n).clip(0),
        "new_process_rate": rng.normal(0.5, 0.4, n).clip(0),
        "file_event_rate": rng.normal(3, 2, n).clip(0),
        "system_event_rate": rng.normal(1, 1, n).clip(0),
        "label": 0,
    })


def cpu_stress_attack(n, rng):
    df = normal_traffic(n, rng)
    df["cpu_usage_percent"] = rng.normal(95, 4, n).clip(0, 100)
    df["process_count"] = rng.normal(150, 15, n).clip(0)
    df["label"] = 1
    return df


def port_scan_attack(n, rng):
    df = normal_traffic(n, rng)
    df["active_connections"] = rng.normal(400, 60, n).clip(0)
    df["network_bytes_rate"] = rng.normal(1_500_000, 300_000, n).clip(0)
    df["label"] = 1
    return df


def process_launch_flood_attack(n, rng):
    df = normal_traffic(n, rng)
    df["new_process_rate"] = rng.normal(25, 5, n).clip(0)
    df["process_count"] = rng.normal(300, 30, n).clip(0)
    df["label"] = 1
    return df


def file_flood_attack(n, rng):
    df = normal_traffic(n, rng)
    df["file_event_rate"] = rng.normal(200, 30, n).clip(0)
    df["disk_io_rate"] = rng.normal(20_000_000, 3_000_000, n).clip(0)
    df["label"] = 1
    return df


def main(n_normal=4000, n_attack_each=250, seed=42, out_path="ml/synthetic_dataset.csv"):
    rng = np.random.default_rng(seed)
    parts = [
        normal_traffic(n_normal, rng),
        cpu_stress_attack(n_attack_each, rng),
        port_scan_attack(n_attack_each, rng),
        process_launch_flood_attack(n_attack_each, rng),
        file_flood_attack(n_attack_each, rng),
    ]
    df = pd.concat(parts, ignore_index=True).sample(frac=1, random_state=seed).reset_index(drop=True)
    df.to_csv(out_path, index=False)
    print(f"Wrote {len(df)} rows ({df['label'].sum()} attack, {(df['label']==0).sum()} normal) to {out_path}")


if __name__ == "__main__":
    main()
