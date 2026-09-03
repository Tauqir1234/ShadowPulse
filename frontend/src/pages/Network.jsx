import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import LineChartCard from "../components/LineChartCard";
import MetricCard from "../components/MetricCard";
import { api } from "../lib/api";
import { useLiveTelemetry } from "../lib/useLiveTelemetry";

export default function Network({ agentId }) {
  const { latest, connected } = useLiveTelemetry(agentId);
  const [points, setPoints] = useState([]);

  useEffect(() => {
    if (!agentId) return;
    const load = () => api.network(agentId).then((r) => setPoints(r.data.points)).catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [agentId]);

  const sentSeries = points.map((p) => ({ t: new Date(p.timestamp).getTime(), value: p.bytes_sent / 1024 }));
  const recvSeries = points.map((p) => ({ t: new Date(p.timestamp).getTime(), value: p.bytes_received / 1024 }));
  const connSeries = points.map((p) => ({ t: new Date(p.timestamp).getTime(), value: p.active_connections }));

  return (
    <Layout agentId={agentId} connected={connected} latest={latest} threatScore={latest?.threat?.threat_score?.toFixed(0) ?? 0}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ color: "var(--pulse)" }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12" y2="20"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>NETWORK THROUGHPUT & CONNECTIONS</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Module 4: IP Flow & Socket Instrumentation</div>
          </div>
        </div>

        <div className="grid grid-3" style={{ marginBottom: 20 }}>
          <MetricCard label="Active TCP/UDP Sockets" value={latest?.network?.active_connections ?? 0} sub="Established Connections" />
          <MetricCard label="Outbound Volume" value={latest?.network ? (latest.network.bytes_sent / 1024).toFixed(0) : 0} unit=" KB" sub="Last Collection Cycle" />
          <MetricCard label="Inbound Volume" value={latest?.network ? (latest.network.bytes_received / 1024).toFixed(0) : 0} unit=" KB" sub="Last Collection Cycle" />
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
           <div className="card-header">
             <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pulse)" strokeWidth="2"><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
                AGGREGATE THROUGHPUT (KB)
             </div>
           </div>
           <div className="grid grid-2" style={{ gap: 16 }}>
             <LineChartCard title="Bytes Sent" data={sentSeries} dataKey="value" color="var(--chart-1)" unit=" KB" height={220} />
             <LineChartCard title="Bytes Received" data={recvSeries} dataKey="value" color="var(--chart-2)" unit=" KB" height={220} />
           </div>
        </div>

        <div className="card">
           <div className="card-header">
             <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pulse)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                ACTIVE CONNECTIONS COUNT
             </div>
           </div>
           <LineChartCard title="Open Sockets" data={connSeries} dataKey="value" color="var(--chart-3)" unit="" height={220} />
        </div>
      </div>
    </Layout>
  );
}
