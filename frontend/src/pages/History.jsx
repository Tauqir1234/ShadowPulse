import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import LineChartCard from "../components/LineChartCard";
import AlertsPanel from "../components/AlertsPanel";
import { api } from "../lib/api";

const WINDOWS = [
  { label: "24h", hours: 24, days: 1 },
  { label: "7d", hours: 24 * 7, days: 7 },
  { label: "30d", hours: 24 * 30, days: 30 },
];

export default function History({ agentId }) {
  const [win, setWin] = useState(WINDOWS[0]);
  const [metrics, setMetrics] = useState({ cpu: [], memory: [], threat_scores: [] });
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!agentId) return;
    api.historyMetrics(agentId, win.hours).then((r) => setMetrics(r.data)).catch(() => {});
    api.historyAlerts(agentId, win.days).then((r) => setAlerts(r.data.alerts)).catch(() => {});
  }, [agentId, win]);

  const cpuSeries = metrics.cpu.map((d) => ({ t: new Date(d.timestamp).getTime(), value: d.cpu_usage_percent }));
  const memSeries = metrics.memory.map((d) => ({ t: new Date(d.timestamp).getTime(), value: d.used_percent }));
  const threatSeries = metrics.threat_scores.map((d) => ({ t: new Date(d.timestamp).getTime(), value: d.threat_score }));

  return (
    <Layout title="Historical Analysis" subtitle="Behavioral trends over time" agentId={agentId}>
      <div className="flex gap-8">
        {WINDOWS.map((w) => (
          <button key={w.label} className={`btn small ${win.label === w.label ? "primary" : ""}`} onClick={() => setWin(w)}>
            {w.label}
          </button>
        ))}
      </div>

      <LineChartCard title="Threat Score Trend" sub={`Last ${win.label}`} data={threatSeries} dataKey="value" color="#f5566b" unit="" height={220} />

      <div className="grid grid-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <LineChartCard title="CPU Usage" sub={`Last ${win.label}`} data={cpuSeries} dataKey="value" color="#7c6cf5" unit="%" />
        <LineChartCard title="Memory Usage" sub={`Last ${win.label}`} data={memSeries} dataKey="value" color="#2dd9d0" unit="%" />
      </div>

      <AlertsPanel alerts={alerts} />
    </Layout>
  );
}
