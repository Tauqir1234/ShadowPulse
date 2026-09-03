# ShadowPulse

**An AI-Based Signature-Free Behavioural Intrusion Detection System**

ShadowPulse learns the normal behavioural pattern of a Windows machine —
CPU, memory, disk, network, processes, file activity, and system events —
and uses an unsupervised Isolation Forest model to flag deviations in
real time, converting anomalies into a 0–100 threat score and generating
alerts on a live dashboard. Built from the accompanying SRS, architecture
diagram, database design, and API spec.

```
Agent (psutil/watchdog) → FastAPI ingest → MongoDB → Isolation Forest
   → Threat Score → Alerts → FastAPI REST/WebSocket → React Dashboard
```

## Project layout

```
shadowpulse/
├── agent/        Python background telemetry collector (Module 1 & 2)
├── backend/      FastAPI + MongoDB + Isolation Forest engine (Modules 3-7)
├── ml/           Synthetic attack simulator + offline model evaluation
├── frontend/     React dashboard (Module 8)
└── docker-compose.yml
```

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env      # edit SECRET_KEY / AGENT_API_KEY
docker compose up --build
```

- Backend API: http://localhost:8000 (docs at `/docs`)
- Dashboard: http://localhost:3000
- MongoDB: localhost:27017

Create your first dashboard login:
```bash
curl -X POST "http://localhost:8000/api/auth/register?username=admin&password=changeme&full_name=Admin"
```

Then start the agent on the machine you want to monitor (see below) and
open the dashboard — it will prompt you for the `agent_id` the agent
prints on startup.

Create a dashboard account from the **Create an account** link on the login
page. To safely exercise anomaly detection without changing the machine,
run the synthetic telemetry test from the project root:
```bash
cd agent
pip install -r requirements.txt
python anomaly_test.py
```
This registers a `agent-test-*` endpoint and posts one normal sample followed
by one unusual sample. It only sends telemetry metadata; it does not create
files, launch processes, scan ports, or modify the system. Connect the
printed agent ID in the dashboard to view the resulting score and alert.

## Running each piece manually (development)

### 1. MongoDB
```bash
docker run -d -p 27017:27017 --name shadowpulse-mongo mongo:7
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```
The API auto-bootstraps a synthetic-baseline Isolation Forest on first
run so it's usable immediately. Once you have a few days of real
telemetry for a machine, retrain on its actual behaviour:
```bash
python -m app.ml.train --agent-id agent-xxxxxxx --days 7
```

### 3. Agent (on the monitored endpoint)
```bash
cd agent
pip install -r requirements.txt
cp .env.example .env    # set SHADOWPULSE_BACKEND_URL / SHADOWPULSE_AGENT_KEY
python agent.py
```
For automatic startup on Windows (FR1), register it as a Scheduled Task
("At log on", any user) or wrap it with NSSM as a Windows service.

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

## ML evaluation (Precision / Recall / ROC-AUC)

The abstract calls for a proper Performance Evaluation Module rather
than a qualitative "it works" claim. Generate simulated-attack data
(CPU stress, port scan, process-launch flood, file-creation flood) and
score the same Isolation Forest pipeline used in production:

```bash
cd ml
python generate_synthetic_data.py
python evaluate_model.py
```

## API surface

Matches `API_ENDPOINTS.png` exactly, plus agent-ingest and auth routes:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | API server status |
| `/api/summary` | GET | Overall system summary |
| `/api/metrics` | GET | Real-time CPU/RAM/disk/network |
| `/api/processes` | GET | Running processes |
| `/api/network` | GET | Network activity |
| `/api/alerts` | GET | Recent alerts |
| `/api/anomalies` | GET | Detected anomalies |
| `/api/threat-score` | GET | Current threat score |
| `/api/history/metrics` | GET | Historical metrics |
| `/api/history/alerts` | GET | Historical alerts |
| `/api/alerts/ack` | PUT | Acknowledge/resolve an alert |
| `/api/auth/login`, `/api/auth/register` | POST | Dashboard auth |
| `/api/agent/register`, `/heartbeat`, `/telemetry` | POST | Agent ingest |
| `/ws/{agent_id}` | WS | Live push feed for the dashboard |

## Notes on scope

- The agent avoids collecting passwords, keystrokes, or file contents,
  per the SRS privacy requirements — file events record path/size/type
  only, never contents.
- `app/ml/engine.py` bootstraps a synthetic baseline so the stack is
  runnable end-to-end immediately; swap in `app/ml/train.py` output
  once you've collected real baseline telemetry for a given machine.
- Multi-endpoint support (NFR5) is schema-ready (`agent_id` on every
  document) — the frontend currently focuses on a single connected
  agent at a time; extending the sidebar to an agent switcher is a
  small follow-up.
