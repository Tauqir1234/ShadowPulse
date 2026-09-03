import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ProcessTable from "../components/ProcessTable";
import MetricCard from "../components/MetricCard";
import { api } from "../lib/api";
import { useLiveTelemetry } from "../lib/useLiveTelemetry";

export default function Processes({ agentId }) {
  const { latest, connected } = useLiveTelemetry(agentId);
  const [processes, setProcesses] = useState([]);
  const [snapshotTime, setSnapshotTime] = useState(null);

  useEffect(() => {
    if (!agentId) return;
    const load = () =>
      api.processes(agentId).then((r) => {
        setProcesses(r.data.processes);
        setSnapshotTime(r.data.snapshot_time);
      }).catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [agentId]);

  useEffect(() => {
    if (latest?.processes?.length) {
      setProcesses(latest.processes);
      setSnapshotTime(latest.processes[0].timestamp);
    }
  }, [latest]);

  const newCount = processes.filter((p) => p.event_type === "created").length;
  const topCpu = processes[0];

  return (
    <Layout agentId={agentId} connected={connected} latest={latest} threatScore={latest?.threat?.threat_score?.toFixed(0) ?? 0}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ color: "var(--pulse)" }}>
             <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>ACTIVE PROCESS MONITOR</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Module 3: Continuous OS-Level Execution State</div>
          </div>
        </div>

        <div className="grid grid-3" style={{ marginBottom: 20 }}>
          <MetricCard label="Captured Processes" value={processes.length} sub={snapshotTime ? new Date(snapshotTime).toLocaleTimeString() : "No snapshot yet"} />
          <MetricCard label="New Spawn Events" value={newCount} sub="Latest stored snapshot" />
          <MetricCard label="Highest Load Agent" value={topCpu ? `${(topCpu.cpu_percent ?? 0).toFixed(1)}%` : "0.0%"} sub={topCpu?.process_name || "No process data"} />
        </div>

        <div className="card">
           <div className="card-header">
             <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--pulse)" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                PROCESS TABLE ENTRIES
             </div>
           </div>
           <ProcessTable processes={processes} />
        </div>
      </div>
    </Layout>
  );
}
