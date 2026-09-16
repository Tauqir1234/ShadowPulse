import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("shadowpulse_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const api = {
  login: (username, password) => {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    return client.post("/api/auth/login", form);
  },
  register: (username, password, fullName, email) =>
    client.post("/api/auth/register", null, {
      params: { username, password, full_name: fullName, email },
    }),
  health: () => client.get("/api/health"),
  summary: (agentId) => client.get("/api/summary", { params: { agent_id: agentId } }),
  metrics: (agentId) => client.get("/api/metrics", { params: { agent_id: agentId } }),
  processes: (agentId) => client.get("/api/processes", { params: { agent_id: agentId } }),
  network: (agentId) => client.get("/api/network", { params: { agent_id: agentId } }),
  alerts: (agentId, status) => client.get("/api/alerts", { params: { agent_id: agentId, status } }),
  ackAlert: (alertId, status, resolvedBy) =>
    client.put("/api/alerts/ack", { alert_id: alertId, status, resolved_by: resolvedBy }),
  clearAlerts: (agentId) => client.delete("/api/alerts", { params: { agent_id: agentId } }),
  anomalies: (agentId) => client.get("/api/anomalies", { params: { agent_id: agentId } }),
  modelBaseline: () => client.get("/api/anomalies/baseline"),
  mlDiagnostics: () => client.get("/api/ml/diagnostics"),
  retrainAnomalyModel: (agentId, days = 7) => client.post("/api/anomalies/retrain", { agent_id: agentId, days }),
  triggerAnomaly: (agentId) => client.post("/api/anomalies/trigger", { agent_id: agentId }),
  threatScore: (agentId) => client.get("/api/threat-score", { params: { agent_id: agentId } }),
  historyMetrics: (agentId, hours) =>
    client.get("/api/history/metrics", { params: { agent_id: agentId, hours } }),
  historyAlerts: (agentId, days) =>
    client.get("/api/history/alerts", { params: { agent_id: agentId, days } }),
  telemetryData: (agentId, limit) =>
    client.get("/api/data/telemetry", { params: { agent_id: agentId, limit } }),
  agents: () => client.get("/api/data/agents"),
  databaseCollections: (agentId, limit) =>
    client.get("/api/data/collections", { params: { agent_id: agentId, limit } }),
};

export default client;
