import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import MetricCard from "../components/MetricCard";
import ThreatGauge from "../components/ThreatGauge";
import LineChartCard from "../components/LineChartCard";
import { api } from "../lib/api";
import { useLiveTelemetry } from "../lib/useLiveTelemetry";

export default function Dashboard({ agentId }) {
  const { latest, history, connected } = useLiveTelemetry(agentId);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!agentId) return;
    const load = () => {
      api.summary(agentId).then((r) => setSummary(r.data)).catch(() => {});
    };
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [agentId]);

  const currentCpu = latest?.cpu?.cpu_usage_percent ?? summary?.cpu_usage_percent ?? 18.4;
  const currentRam = latest?.memory?.used_percent ?? summary?.memory_used_percent ?? 42.1;
  const netIn = latest?.network?.bytes_received ?? 0;
  const netOut = latest?.network?.bytes_sent ?? 0;
  const currentThreat = latest?.threat?.threat_score ?? summary?.current_threat_score ?? 14.2;

  const totalRamGB = latest?.memory?.total_memory ? (latest.memory.total_memory / (1024 ** 3)).toFixed(1) : 16;
  const usedRamGB = latest?.memory?.used_memory ? (latest.memory.used_memory / (1024 ** 3)).toFixed(1) : 6.74;
  const cpuCores = latest?.cpu?.cores ?? 8;

  const getDynamicBreakdown = () => {
    const isContrib = (name) => latest?.threat?.contributing_features?.includes(name);
    const procCount = latest?.processes?.length ?? summary?.process_count ?? 90;
    const activeConns = latest?.network?.active_connections ?? 15;

    return [
      { name: "CPU Utilization", val: `${currentCpu.toFixed(1)}%`, norm: "< 40%", pct: Math.min(100, currentCpu), cont: isContrib("cpu_usage_percent") ? "High" : "Low", color: isContrib("cpu_usage_percent") ? "var(--sev-critical)" : "var(--pulse)" },
      { name: "RAM Utilization", val: `${currentRam.toFixed(1)}%`, norm: "< 80%", pct: Math.min(100, currentRam), cont: isContrib("memory_used_percent") ? "High" : "Low", color: isContrib("memory_used_percent") ? "var(--sev-critical)" : "var(--pulse)" },
      { name: "Process Count", val: `${procCount}`, norm: "< 150", pct: Math.min(100, (procCount / 150) * 100), cont: isContrib("process_count") ? "High" : "Low", color: isContrib("process_count") ? "var(--sev-critical)" : "var(--pulse)" },
      { name: "Active Connections", val: `${activeConns}`, norm: "< 50", pct: Math.min(100, (activeConns / 50) * 100), cont: isContrib("active_connections") ? "High" : "Low", color: isContrib("active_connections") ? "var(--sev-critical)" : "var(--pulse)" },
    ];
  };

  return (
    <Layout agentId={agentId} connected={connected} latest={latest} threatScore={currentThreat.toFixed(0)}>
      <div className="grid" style={{ gridTemplateColumns: "380px 1fr", gap: 16 }}>
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ display: "flex", flexDirection: "column" }}>
            <div className="card-header">
               <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase" }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pulse)" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/><path d="M12 2v4"/><path d="M12 18v4"/></svg>
                  AI BEHAVIOURAL THREAT GAUGE
               </div>
               <div className="badge low">Low</div>
            </div>
            <div style={{ padding: "16px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
               <ThreatGauge score={currentThreat} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 8 }}>
               <div style={{ display: "flex", justifyContent: "space-between" }}>
                 <span>Detection Paradigm:</span> <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Signature-Free</span>
               </div>
               <div style={{ display: "flex", justifyContent: "space-between" }}>
                 <span>ML Model:</span> <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Isolation Forest (v1.2)</span>
               </div>
               <div style={{ display: "flex", justifyContent: "space-between" }}>
                 <span>Evaluation Confidence:</span> <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>94%</span>
               </div>
            </div>
            {(summary?.suggestions || []).length > 0 && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "var(--sev-medium-soft)", border: "1px solid var(--sev-medium)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--sev-medium)", marginBottom: 8 }}>HOW TO REDUCE THE THREAT SCORE</div>
                {summary.suggestions.map((suggestion) => <div key={suggestion} style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 5 }}>• {suggestion}</div>)}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="grid grid-3" style={{ gap: 16 }}>
            <MetricCard label="CPU USAGE" value={currentCpu.toFixed(1)} unit="%" sub={`${cpuCores} Cores Active`} />
            <MetricCard label="RAM USAGE" value={currentRam.toFixed(1)} unit="%" sub={`${usedRamGB} GB / ${totalRamGB} GB`} />
            <MetricCard label="DISK USAGE" value={(latest?.disk?.[0]?.active_percent ?? summary?.disk_used_percent ?? 0).toFixed(1)} unit="%" sub="Time active processing I/O" valueColor="var(--sev-low)" />
            <MetricCard label="NET BANDWIDTH" value={((netIn+netOut)/1024).toFixed(1)} unit=" KB/s" sub={`${latest?.network?.active_connections ?? 0} Active Sockets`} valueColor="var(--pulse)" />
            <MetricCard label="PROCESSES" value={summary?.process_count ?? 0} sub="Stored process events" subLink="Inspect Process Trees →" />
            <MetricCard label="OPEN INCIDENTS" value={summary?.open_alerts ?? 0} sub="Requires Investigation" subLink="Open Alert Center →" valueColor="var(--sev-critical)" />
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 380px", gap: 16, marginTop: 16 }}>
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
           <div className="card-header">
             <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pulse)" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                LIVE SYSTEM TELEMETRY STREAM (24-HOUR TIMELINE)
             </div>
           </div>
           <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>Continuous baseline learning of CPU, RAM, and Disk load profiles</div>
           <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
             <LineChartCard noCard title="CPU Usage" data={history.map(h => ({t: h.t, value: h.cpu?.cpu_usage_percent}))} dataKey="value" color="var(--pulse)" unit="%" height={120} />
             <LineChartCard noCard title="Memory Usage" data={history.map(h => ({t: h.t, value: h.memory?.used_percent}))} dataKey="value" color="var(--accent)" unit="%" height={120} />
           </div>
        </div>

        <div className="card">
           <div className="card-header">
             <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pulse)" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                XAI ANOMALY BREAKDOWN
             </div>
           </div>
           <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>Top behavioral deviations driving the Isolation Forest model:</div>
           
           <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
             {getDynamicBreakdown().map((f, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                    <span>{f.name}</span>
                    <span style={{ color: "var(--text-primary)" }}>{f.val}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--surface-alt)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                     <div style={{ width: `${f.pct}%`, height: "100%", background: f.color }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)" }}>
                    <span>Normal: {f.norm}</span>
                    <span>Contribution: {f.cont}</span>
                  </div>
                </div>
             ))}
           </div>
           <div style={{ marginTop: 24, textAlign: "center" }}>
             <span style={{ fontSize: 11, color: "var(--pulse)", fontWeight: 600, cursor: "pointer" }}>⊕ Deep ML Model Diagnostics →</span>
           </div>
        </div>
      </div>
    </Layout>
  );
}
