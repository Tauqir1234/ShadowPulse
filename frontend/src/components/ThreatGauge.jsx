const SEVERITY_COLOR = {
  Low: "var(--sev-low)",
  Medium: "var(--sev-medium)",
  High: "var(--sev-high)",
  Critical: "var(--sev-critical)",
};

function severityFor(score) {
  if (score >= 91) return "Critical";
  if (score >= 61) return "High";
  if (score >= 31) return "Medium";
  return "Low";
}

/** Semi-circular threat-score gauge, 0-100, banded Low/Medium/High/Critical. */
export default function ThreatGauge({ score = 0, contributingFeatures = [] }) {
  const clamped = Math.max(0, Math.min(100, score));
  const severity = severityFor(clamped);
  const color = SEVERITY_COLOR[severity];

  // semi-circle arc from 180deg to 0deg
  const radius = 74;
  const cx = 100;
  const cy = 100;
  const angle = 180 - (clamped / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const needleX = cx + radius * 0.86 * Math.cos(rad);
  const needleY = cy - radius * 0.86 * Math.sin(rad);

  const arc = (startPct, endPct, col) => {
    const a1 = 180 - (startPct / 100) * 180;
    const a2 = 180 - (endPct / 100) * 180;
    const r1 = (a1 * Math.PI) / 180;
    const r2 = (a2 * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(r1);
    const y1 = cy - radius * Math.sin(r1);
    const x2 = cx + radius * Math.cos(r2);
    const y2 = cy - radius * Math.sin(r2);
    return <path key={col} d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`} stroke={col} strokeWidth="12" fill="none" strokeLinecap="round" opacity="0.85" />;
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="card-header" style={{ width: "100%" }}>
        <div>
          <div className="card-title">Threat Score</div>
          <div className="card-sub">Isolation Forest · live behavioral scoring</div>
        </div>
        <span className={`badge ${severity.toLowerCase()}`}>{severity}</span>
      </div>

      <svg width="200" height="120" viewBox="0 0 200 120">
        {arc(0, 30, "var(--sev-low)")}
        {arc(30, 60, "var(--sev-medium)")}
        {arc(60, 90, "var(--sev-high)")}
        {arc(90, 100, "var(--sev-critical)")}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4.5" fill="var(--text-primary)" />
      </svg>

      <div style={{ fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 600, color, marginTop: -6 }}>
        {clamped.toFixed(0)}
        <span style={{ fontSize: 14, color: "var(--text-muted)" }}>/100</span>
      </div>

      {contributingFeatures?.length > 0 && (
        <div style={{ marginTop: 10, textAlign: "center" }}>
          <div className="card-sub" style={{ marginBottom: 6 }}>Contributing indicators</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {contributingFeatures.map((f) => (
              <span key={f} className="badge" style={{ color: "var(--text-secondary)", background: "var(--surface-alt)" }}>
                {f.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
