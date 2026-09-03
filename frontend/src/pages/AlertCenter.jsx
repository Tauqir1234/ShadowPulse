import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import MetricCard from "../components/MetricCard";
import { api } from "../lib/api";
import { useLiveTelemetry } from "../lib/useLiveTelemetry";

export default function AlertCenter({ agentId }) {
  const { latest, connected } = useLiveTelemetry(agentId);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!agentId) return;
    const load = () => api.alerts(agentId).then(({ data }) => setAlerts(data.alerts || [])).catch(() => {});
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [agentId]);

  function exportAlerts() {
    const blob = new Blob([JSON.stringify(alerts, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shadowpulse-alerts-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function updateAlert(alert) {
    const status = alert.status === "Open" ? "Acknowledged" : "Resolved";
    await api.ackAlert(alert.alert_id, status);
    setAlerts((current) => current.map((item) => item.alert_id === alert.alert_id ? { ...item, status } : item));
  }

  const openCount = alerts.filter((alert) => alert.status === "Open").length;
  const acknowledgedCount = alerts.filter((alert) => alert.status === "Acknowledged").length;
  const resolvedCount = alerts.filter((alert) => alert.status === "Resolved").length;

  return (
    <Layout agentId={agentId} connected={connected} latest={latest} threatScore={latest?.threat?.threat_score?.toFixed(0) ?? 0}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ color: "var(--sev-medium)" }}>
             <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>ALERT CENTER — INCIDENT TRIAGE & FORENSIC HISTORY</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Module 7: Severity-ranked alerts, analyst workflow, forensic JSON export</div>
          </div>
          <button className="btn" onClick={exportAlerts} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "8px 16px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text-primary)" }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export Forensic JSON
          </button>
        </div>

        <div className="grid grid-3" style={{ marginBottom: 20 }}>
          <MetricCard label="OPEN INCIDENTS" value={openCount} sub="Requires Triage" valueColor="var(--sev-critical)" />
          <MetricCard label="ACKNOWLEDGED" value={acknowledgedCount} sub="Under Investigation" valueColor="var(--sev-medium)" />
          <MetricCard label="RESOLVED" value={resolvedCount} sub="Closed & Documented" valueColor="var(--sev-low)" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, position: "relative" }}>
             <svg style={{ position: "absolute", left: 12, top: 10, color: "var(--text-muted)" }} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
             <input placeholder="Search alerts..." style={{ width: "100%", background: "var(--surface-alt)", border: "1px solid var(--border)", padding: "8px 12px 8px 36px", borderRadius: 20, color: "var(--text-primary)", fontSize: 12 }} />
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
               <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Severity:
               <span style={{ padding: "4px 8px", border: "1px solid var(--pulse)", borderRadius: 12, color: "var(--pulse)", fontWeight: 600 }}>All</span>
               <span style={{ color: "var(--text-muted)" }}>Critical</span>
               <span style={{ color: "var(--text-muted)" }}>High</span>
               <span style={{ color: "var(--text-muted)" }}>Medium</span>
               <span style={{ color: "var(--text-muted)" }}>Low</span>
            </div>
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
               Status:
               <span style={{ padding: "4px 8px", border: "1px solid var(--pulse)", borderRadius: 12, color: "var(--pulse)", fontWeight: 600 }}>All</span>
               <span style={{ color: "var(--text-muted)" }}>Open</span>
               <span style={{ color: "var(--text-muted)" }}>Acknowledged</span>
               <span style={{ color: "var(--text-muted)" }}>Resolved</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {alerts.length === 0 ? <div className="empty-state">No alerts stored for this agent.</div> : alerts.map((a) => {
             const sevColor = a.severity === 'Critical' ? 'var(--sev-critical)' : a.severity === 'High' ? 'var(--accent)' : a.severity === 'Medium' ? 'var(--sev-medium)' : 'var(--sev-low)';
             return (
             <div key={a.alert_id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px", background: "var(--surface)", border: `1px solid ${sevColor}`, borderRadius: 8 }}>
               <div style={{ display: "flex", gap: 16, flex: 1 }}>
                 <div style={{ padding: "4px 8px", background: `color-mix(in srgb, ${sevColor} 15%, transparent)`, color: sevColor, fontSize: 10, fontWeight: 700, borderRadius: 4, height: "fit-content" }}>
                   {a.severity}
                 </div>
                 <div style={{ flex: 1 }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                     {a.title}
                     <span style={{ color: a.status === 'Open' ? 'var(--sev-critical)' : 'var(--sev-medium)', fontSize: 10 }}>[{a.status}]</span>
                   </div>
                   <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: "var(--text-muted)" }}>
                     <span>ID: {a.alert_id}</span>
                     <span style={{ display: "flex", alignItems: "center", gap: 4 }}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {new Date(a.created_at).toLocaleTimeString()}</span>
                     <span>Source: {a.alert_type}</span>
                     <span>Score: <span style={{ color: sevColor }}>{a.threat_score ?? 0}%</span></span>
                   </div>
                   {a.suggestions && a.suggestions.length > 0 && (
                     <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--surface-alt)", borderRadius: 4, borderLeft: "2px solid var(--pulse)" }}>
                       <div style={{ fontSize: 10, fontWeight: 700, color: "var(--pulse)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Remediation</div>
                       <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "var(--text-secondary)" }}>
                         {a.suggestions.map((s, i) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}
                       </ul>
                     </div>
                   )}
                 </div>
               </div>
               
               <div style={{ position: "relative" }}>
                 <button onClick={() => updateAlert(a)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "8px 12px", borderRadius: 4, fontSize: 12, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                   {a.status === 'Open' ? 'Acknowledge' : a.status === 'Acknowledged' ? 'Resolve' : 'Resolved'}
                   <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                 </button>
               </div>
             </div>
             );
           })}
        </div>
      </div>
    </Layout>
  );
}
