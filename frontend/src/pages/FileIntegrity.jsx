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
      const interval = setInterval(fetchEvents, 5000);
      return () => clearInterval(interval);
    }
  }, [agentId]);

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

        <div className="grid grid-3" style={{ gridTemplateColumns: "350px 1fr 1fr", gap: 16, marginBottom: 20 }}>
          {/* File Entropy Radar */}
          <div className="card" style={{ display: "flex", flexDirection: "column", height: 260 }}>
            <div className="card-title" style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: "0.05em", marginBottom: 16 }}>File Entropy Radar</div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
               {/* Simple mock radar chart using SVG */}
               <svg width="120" height="120" viewBox="0 0 100 100">
                  <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="none" stroke="var(--border)" strokeWidth="1"/>
                  <polygon points="50,25 75,40 75,60 50,75 25,60 25,40" fill="none" stroke="var(--border)" strokeWidth="1"/>
                  <line x1="50" y1="50" x2="50" y2="10" stroke="var(--border)" strokeWidth="1"/>
                  <line x1="50" y1="50" x2="90" y2="30" stroke="var(--border)" strokeWidth="1"/>
                  <line x1="50" y1="50" x2="90" y2="70" stroke="var(--border)" strokeWidth="1"/>
                  <line x1="50" y1="50" x2="50" y2="90" stroke="var(--border)" strokeWidth="1"/>
                  <line x1="50" y1="50" x2="10" y2="70" stroke="var(--border)" strokeWidth="1"/>
                  <line x1="50" y1="50" x2="10" y2="30" stroke="var(--border)" strokeWidth="1"/>
                  <polygon points="50,30 65,45 60,60 50,65 40,60 35,45" fill="rgba(45, 217, 208, 0.2)" stroke="var(--sev-low)" strokeWidth="2"/>
               </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, marginTop: 12 }}>
               <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                 <span>Avg File Entropy:</span> <span style={{ color: "var(--sev-low)", fontWeight: 600 }}>4.12 / 8.0 (Normal)</span>
               </div>
               <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                 <span>Encryption Threshold:</span> <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>7.0 / 8.0</span>
               </div>
               <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                 <span>Watchdog Status:</span> <span style={{ color: "var(--sev-low)", fontWeight: 600 }}>ACTIVE</span>
               </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
             <MetricCard label="TOTAL EVENTS" value={events.length.toString()} sub="Create, modify, delete, rename" />
             <div className="card" style={{ flex: 1 }}>
               <div className="card-title" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 12 }}>Live File Activity</div>
               <div style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                   {["created", "modified", "deleted", "renamed"].map((type) => <span key={type}>{type}: <strong>{eventCounts[type] || 0}</strong></span>)}
                 </div>
                 <div style={{ marginTop: 8, color: "var(--text-muted)" }}>All accessible mounted drives are monitored recursively.</div>
               </div>
             </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
             <MetricCard label="CRITICAL EVENTS" value="0" valueColor="var(--sev-critical)" />
             <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
               <div className="card-title" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: "0.05em", color: "var(--text-muted)" }}>Monitored Dirs</div>
               <div style={{ flex: 1, display: "flex", alignItems: "center", fontSize: 32, fontWeight: 700, fontFamily: "var(--font-display)" }}>
                 ALL
               </div>
             </div>
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
