export default function ProcessTable({ processes = [] }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Running Processes</div>
          <div className="card-sub">All accessible processes, refreshed with the latest agent snapshot</div>
        </div>
      </div>
      {processes.length === 0 ? (
        <div className="empty-state">No process telemetry yet — start the agent to populate this view.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>PID</th>
                <th>Process</th>
                <th>User</th>
                <th>CPU %</th>
                <th>Memory %</th>
                <th>Memory</th>
                <th>Threads</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((p) => (
                <tr key={p.pid}>
                  <td className="mono">{p.pid}</td>
                  <td>{p.process_name}</td>
                  <td className="text-muted">{p.user || "—"}</td>
                  <td className="mono">{(p.cpu_percent ?? 0).toFixed(1)}</td>
                  <td className="mono">{(p.memory_percent ?? 0).toFixed(2)}</td>
                  <td className="mono">{(p.memory_mb ?? 0).toFixed(1)} MB</td>
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
