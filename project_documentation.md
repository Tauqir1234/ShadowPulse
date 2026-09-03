# ShadowPulse Project Documentation

This document provides a comprehensive breakdown of the ShadowPulse frontend pages, detailing the information they display, the visualizations/graphs used, the underlying data stored, and their primary use cases.

---

## 1. Dashboard (`Dashboard.jsx`)
**Purpose:** Acts as the main command center, providing a high-level overview of the system's live telemetry and threat status.
**Information Stored & Displayed:**
- **System Load:** Current CPU usage (%), RAM usage (%), Disk storage usage (%), and Network bandwidth (KB/s).
- **Process Info:** Total count of stored process events.
- **Incident Summary:** Count of open incidents/alerts requiring investigation.
- **Threat Intelligence:** Current AI Behavioral Threat Score (0-100), detection paradigm details (Signature-Free), ML model version (Isolation Forest v1.2), evaluation confidence (94%), and actionable suggestions to reduce the threat score.
- **XAI Anomaly Breakdown:** Key feature deviations driving the threat score (e.g., CPU Utilization, Process Creation Rate, Outbound Network Entropy, File System I/O Burst) compared to learned baselines.
**Graphs & Visualizations:**
- **Threat Gauge:** A circular/semi-circular gauge indicating the real-time threat score.
- **Live System Telemetry Stream:** Two line charts tracking CPU usage and Memory usage over a rolling 24-hour timeline.
- **Feature Contribution Bars:** Horizontal bar charts visualizing the contribution percentage of various anomalous features.
**Use Case:** Quick triage and overall health monitoring of the agent.

---

## 2. AI/ML Anomaly Detection Engine (`MLEngine.jsx`)
**Purpose:** Provides deep diagnostics into the unsupervised Isolation Forest model driving the behavioral threat scores.
**Information Stored & Displayed:**
- **Model Evaluation Metrics:** Precision (98.4%), Recall (96.8%), False Alarm Rate (1.8%), Detection Speed (14.2 ms), and ROC-AUC Score (0.987).
- **Model Configuration Details:** Algorithm parameters, number of estimators (150 trees), contamination factor, training sample count, and retraining timestamps.
- **Trained Feature Vector (8D):** Feature weights and importance for metrics like CPU/Memory usage, disk IOPS, network rates, open sockets, process fork rates, and entropy deltas.
**Graphs & Visualizations:**
- **2D Anomaly Map:** A time-series line chart mapping live threat scores over time.
- **ROC-AUC Curve:** A benchmark line chart comparing the True Positive Rate against the False Positive Rate.
- **XAI Attribution:** A text-based breakdown of features that deviate furthest from the normal baseline.
- **Feature Weights Bars:** Horizontal gradient bars indicating the relative weight of the 8 dimensions in the machine learning model.
**Use Case:** Security analysts tuning the ML model, manually triggering test anomalies, or retraining the baseline based on current host behavior.

---

## 3. File Integrity Guard (`FileIntegrity.jsx`)
**Purpose:** Monitors file system events to detect suspicious modifications or ransomware-like encryption bursts.
**Information Stored & Displayed:**
- **Watchdog Status:** Tracks monitored directories (e.g., Documents, Desktop, AppData, System32).
- **Event Metrics:** Total events captured, critical events, and average file entropy score vs. encryption threshold.
- **Event Log:** A historical log of filesystem actions (file creations, modifications, deletions, renames) paired with specific file paths and timestamps.
**Graphs & Visualizations:**
- **File Entropy Radar:** A dynamic SVG radar polygon charting file entropy levels across multiple dimensions to visualize deviation from normal baseline thresholds.
**Use Case:** Auditing file modifications, identifying ransomware encryption activity, and reviewing granular file system audit trails.

---

## 4. Alert Center (`AlertCenter.jsx`)
**Purpose:** Incident triage and forensic historical tracking for all generated alerts.
**Information Stored & Displayed:**
- **Alert Metrics:** Counts of Open, Acknowledged, and Resolved incidents.
- **Alert Data:** Detailed list of alerts containing ID, severity rating (Critical, High, Medium, Low), title, timestamp, source/type, and associated threat score.
- **Workflow State:** Status tracking for each alert (Open -> Acknowledged -> Resolved).
**Graphs & Visualizations:**
- None. Relies on structured list views and metric cards.
**Use Case:** Daily operational workflow for analysts to acknowledge and resolve active security incidents, and export forensic JSON data for external reporting.

---

## 5. Network Throughput (`Network.jsx`)
**Purpose:** Real-time monitoring of network interface utilization and socket activity.
**Information Stored & Displayed:**
- **Socket Metrics:** Active TCP/UDP established connections.
- **Bandwidth Metrics:** Outbound volume (bytes sent) and Inbound volume (bytes received) for the latest collection cycle.
**Graphs & Visualizations:**
- **Aggregate Throughput (KB):** Two distinct line charts visualizing bytes sent and bytes received over time.
- **Active Connections Count:** A time-series line chart tracking the volume of open network sockets over time.
**Use Case:** Identifying data exfiltration attempts, botnet command-and-control (C2) communication, or anomalous bursts in outbound traffic.

---

## 6. Active Process Monitor (`Processes.jsx`)
**Purpose:** Continuous OS-level execution state monitoring to track newly spawned applications and processes.
**Information Stored & Displayed:**
- **Process Metrics:** Total captured processes, new spawn events (creations), and identification of the highest load agent (top CPU consuming process).
- **Process Table:** Granular list of active OS processes containing process name, event type (e.g., creation), CPU percentage utilization, and timestamps.
**Graphs & Visualizations:**
- Structured Data Table for raw process review.
**Use Case:** Threat hunting for suspicious executables, unapproved background tasks, or resource-hogging cryptominers.

---

## 7. Endpoint Telemetry Streams (`Telemetry.jsx`)
**Purpose:** Raw ingestion metrics detailing the physical and logical resource allocation of the host machine.
**Information Stored & Displayed:**
- **Host Metrics:** CPU load (across all physical/logical cores), memory allocated (GB used vs total), combined network in/out MB/s.
- **Database Metrics:** Total telemetry records ingested and stored in MongoDB.
**Graphs & Visualizations:**
- **Resource Allocation Profile:** Line charts tracking overall CPU and Memory utilization percentages over time.
- **Individual CPU Core Load Distribution:** Dynamic vertical bar charts showing the real-time load distribution across every individual CPU core.
- **Network Traffic Activity:** Line chart tracking total network traffic bandwidth (In + Out) over time.
**Use Case:** Deep dive into system performance, identifying hardware bottlenecks, and confirming telemetry ingestion pipeline health.

---

## 8. Historical Analysis (`History.jsx`)
**Purpose:** Long-term behavioral trend analysis over specified time windows (24h, 7d, 30d).
**Information Stored & Displayed:**
- **Historical Metrics:** CPU, Memory, and Threat score data points over the selected time window.
- **Historical Alerts:** Acknowledged and resolved alerts that occurred within the time frame.
**Graphs & Visualizations:**
- **Threat Score Trend:** Line chart of historical anomaly threat scores.
- **Resource Trends:** Line charts for long-term CPU usage and Memory usage trends.
**Use Case:** Post-incident review, establishing historical baselines, and identifying slow-moving long-term behavioral anomalies.

---

## 9. Database Explorer (`Database.jsx`)
**Purpose:** Developer and diagnostic view into the raw telemetry stored within the backend database.
**Information Stored & Displayed:**
- **MongoDB Collections:** List of available data collections (e.g., telemetry_events, alerts, process_events) and their document counts.
- **Raw JSON Output:** Unformatted JSON strings representing the literal documents fetched from the database.
**Graphs & Visualizations:**
- None. Purely text/JSON based.
**Use Case:** Debugging data ingestion issues, verifying raw data schemas, or auditing database payloads directly from the UI.
