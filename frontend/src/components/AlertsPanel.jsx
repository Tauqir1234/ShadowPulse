import { IconCheck } from "./Icons";

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AlertsPanel({ alerts = [], onAck, compact = false }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Recent Alerts</div>
          <div className="card-sub">Behavioral anomalies exceeding the threat threshold</div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">No alerts — behavior is within the learned baseline.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alerts.map((a) => (
            <div
              key={a.alert_id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 10,
                background: "var(--surface-alt)",
                border: "1px solid var(--border-soft)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="flex items-center gap-8" style={{ marginBottom: 4 }}>
                  <span className={`badge ${a.severity?.toLowerCase()}`}>{a.severity}</span>
                  <span className={`badge status-${a.status?.toLowerCase()}`}>{a.status}</span>
                  <span className="text-muted" style={{ fontSize: 11 }}>{timeAgo(a.created_at)}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</div>
                {!compact && <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{a.description}</div>}
              </div>
              {a.status === "Open" && onAck && (
                <button className="btn small" onClick={() => onAck(a.alert_id, "Acknowledged")}>
                  <span className="flex items-center gap-8"><IconCheck /> Ack</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
