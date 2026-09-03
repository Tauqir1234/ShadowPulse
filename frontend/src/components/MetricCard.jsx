export default function MetricCard({ label, value, unit, sub }) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}
        {unit && <span style={{ fontSize: 14, color: "var(--text-muted)", marginLeft: 4 }}>{unit}</span>}
      </div>
      {sub && <div className="kpi-delta">{sub}</div>}
    </div>
  );
}
