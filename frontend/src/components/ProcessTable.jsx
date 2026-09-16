import { useMemo } from 'react';

export default function ProcessTable({ processes = [] }) {
  const groupedProcesses = useMemo(() => {
    const map = new Map();
    for (const p of processes) {
      if (!map.has(p.process_name)) {
        map.set(p.process_name, { ...p, count: 1 });
      } else {
        const existing = map.get(p.process_name);
        existing.cpu_percent = (existing.cpu_percent || 0) + (p.cpu_percent || 0);
        existing.memory_percent = (existing.memory_percent || 0) + (p.memory_percent || 0);
        existing.memory_mb = (existing.memory_mb || 0) + (p.memory_mb || 0);
        existing.disk_io = (existing.disk_io || 0) + (p.disk_io || 0);
        existing.threads = (existing.threads || 0) + (p.threads || 0);
        existing.count += 1;
      }
    }
    // Sort by CPU usage descending
    return Array.from(map.values()).sort((a, b) => (b.cpu_percent || 0) - (a.cpu_percent || 0));
  }, [processes]);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Running Processes</div>
          <div className="card-sub">Aggregated by application (matching Task Manager)</div>
        </div>
      </div>
      {groupedProcesses.length === 0 ? (
        <div className="empty-state">No process telemetry yet — start the agent to populate this view.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Process</th>
                <th>Count</th>
                <th>User</th>
                <th>CPU %</th>
                <th>Memory %</th>
                <th>Memory</th>
                <th>I/O (Disk+Net)</th>
                <th>Threads</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {groupedProcesses.map((p) => (
                <tr key={p.process_name}>
                  <td>{p.process_name}</td>
                  <td className="mono">{p.count}</td>
                  <td className="text-muted">{p.user || "—"}</td>
                  <td className="mono">{(p.cpu_percent ?? 0).toFixed(1)}</td>
                  <td className="mono">{(p.memory_percent ?? 0).toFixed(2)}</td>
                  <td className="mono">{(p.memory_mb ?? 0).toFixed(1)} MB</td>
                  <td className="mono">{p.disk_io ? (p.disk_io / 1024 / 1024).toFixed(2) + ' MB/s' : '0 MB/s'}</td>
                  <td className="mono">{p.threads ?? 0}</td>
                  <td>
                    <span className="badge" style={{
                      color: p.status === "running" ? "var(--sev-low)" : "var(--text-muted)",
                      background: p.status === "running" ? "var(--sev-low-soft)" : "var(--surface-alt)",
                    }}>
                      {p.status || p.event_type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
