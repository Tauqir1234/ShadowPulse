import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import MetricCard from "../components/MetricCard";
import { useLiveTelemetry } from "../lib/useLiveTelemetry";
import api from "../lib/api";

export default function FileIntegrity({ agentId }) {
  const { latest, connected } = useLiveTelemetry(agentId);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await api.get(`/api/integrity/events?agent_id=${agentId}&limit=100`);
        setEvents(res.data.events || []);
      } catch (err) {
        console.error("Failed to fetch file events", err);
      }
    }

    if (agentId) {
      fetchEvents();
      const interval = setInterval(fetchEvents, 8000);
      return () => clearInterval(interval);
    }
  }, [agentId]);

  useEffect(() => {
    if (latest?.file_events?.length > 0) {
      setEvents((prev) => {
        // Prepend new live events, keep max 100
        const combined = [...latest.file_events, ...prev];
        return combined.slice(0, 100);
      });
    }
  }, [latest]);

  const eventCounts = events.reduce((counts, event) => {
    counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    return counts;
  }, {});

  return (
    <Layout agentId={agentId} connected={connected} latest={latest} threatScore={latest?.threat?.threat_score?.toFixed(0) ?? 0}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ color: "var(--pulse)" }}>
             <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>FILE INTEGRITY GUARD — WATCHDOG & RANSOMWARE SENTINEL</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Module 6: Python Watchdog file event monitoring, entropy analysis, ransomware burst detection</div>
          </div>
        </div>



        <div className="card">
           <div className="card-header" style={{ marginBottom: 16 }}>
             <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pulse)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/></svg>
                 WATCHDOG FILE EVENT LOG
             </div>
           </div>
               <div className="card-sub" style={{ marginBottom: 12 }}>Live changes are collected from the endpoint agent. Explorer reads/accesses require Windows File System auditing and are not reported by watchdog notifications.</div>
           <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
             {events.length === 0 ? (
               <div style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)" }}>No file events detected</div>
             ) : events.map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--surface-alt)", borderRadius: 6, border: "1px solid var(--border)" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ padding: "4px 8px", background: `color-mix(in srgb, var(--pulse) 15%, transparent)`, color: "var(--pulse)", fontSize: 10, fontWeight: 700, borderRadius: 4, width: 70, textAlign: "center" }}>
                        {e.event_type?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, wordBreak: "break-all" }}>{e.file_path}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", gap: 12, alignItems: "center" }}>
                           <span style={{ display: "flex", alignItems: "center", gap: 4 }}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {new Date(e.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                   </div>
                   <div style={{ padding: "4px 12px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 10, color: "var(--text-muted)" }}>
                     {e.event_type === "modified" ? "Modified" : e.event_type === "created" ? "Created" : e.event_type === "deleted" ? "Deleted" : e.event_type === "renamed" ? "Renamed" : "Observed"}
                   </div>
                </div>
             ))}
           </div>
        </div>
      </div>
    </Layout>
  );
}
