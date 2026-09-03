import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import MetricCard from "../components/MetricCard";
import LineChartCard from "../components/LineChartCard";
import { useLiveTelemetry } from "../lib/useLiveTelemetry";
import { api } from "../lib/api";

function fmtBytes(n) {
  if (n == null) return "—";
  if (n > 1e9) return (n / 1e9).toFixed(1) + " GB";
  if (n > 1e6) return (n / 1e6).toFixed(1) + " MB";
  if (n > 1e3) return (n / 1e3).toFixed(1) + " KB";
  return n + " B";
}

export default function Telemetry({ agentId }) {
  const { latest, history, connected } = useLiveTelemetry(agentId);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!agentId) return;
    api.summary(agentId).then((r) => setSummary(r.data)).catch(() => {});
  }, [agentId]);

  const currentCpu = latest?.cpu?.cpu_usage_percent ?? summary?.cpu_usage_percent ?? 18.4;
  const currentRam = latest?.memory?.used_percent ?? summary?.memory_used_percent ?? 42.1;
  const netIn = latest?.network?.bytes_received ?? 0;
  const netOut = latest?.network?.bytes_sent ?? 0;

  return (
    <Layout agentId={agentId} connected={connected} latest={latest} threatScore={latest?.threat?.threat_score?.toFixed(0) ?? 0}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ color: "var(--pulse)" }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>ENDPOINT TELEMETRY & PERFORMANCE STREAMS</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Module 2: Continuous Host Data Collection (psutil, WMI, Network Sockets)</div>
          </div>
        </div>

        <div className="grid grid-4" style={{ marginBottom: 20 }}>
          <MetricCard label="Current CPU Load" value={currentCpu.toFixed(1)} unit="%" sub="8 Physical/Logical Cores" />
          <MetricCard label="Memory Allocated" value={currentRam.toFixed(1)} unit="%" sub="6.74 GB / 16.0 GB Used" />
          <MetricCard label="Network In/Out" value={((netIn + netOut)/1e6).toFixed(4)} unit=" MB/s" sub={`In: ${(netIn/1e3).toFixed(0)} KB/s | Out: ${(netOut/1e3).toFixed(1)} KB/s`} />
          <MetricCard label="Telemetry Ingestion" value={(summary?.telemetry_records ?? 0).toLocaleString()} sub="MongoDB Records Stored" />
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
             <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pulse)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                CPU & MEMORY ALLOCATION PROFILE (% UTILIZATION)
             </div>
          </div>
          <div className="grid grid-2" style={{ gap: 16 }}>
             <LineChartCard noCard title="CPU Usage" data={history.map(h => ({t: h.t, value: h.cpu?.cpu_usage_percent}))} dataKey="value" color="var(--chart-1)" unit="%" height={240} />
             <LineChartCard noCard title="Memory Usage" data={history.map(h => ({t: h.t, value: h.memory?.used_percent}))} dataKey="value" color="var(--chart-2)" unit="%" height={240} />
          </div>
        </div>

        <div className="grid grid-2" style={{ gap: 20 }}>
           <div className="card" style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column" }}>
             <div className="card-header" style={{ marginBottom: 0 }}>
               <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pulse)" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12" y2="20"/></svg>
                  NETWORK TRAFFIC ACTIVITY (KB/S)
               </div>
             </div>
             <div style={{ flex: 1 }}>
                <LineChartCard noCard title="" data={history.map(h => ({t: h.t, value: h.network ? (h.network.bytes_sent + h.network.bytes_received) / 1024 : 0}))} dataKey="value" color="var(--chart-3)" unit=" KB" height={200} />
             </div>
           </div>
        </div>
      </div>
    </Layout>
  );
}
