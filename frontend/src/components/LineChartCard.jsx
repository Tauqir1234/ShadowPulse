import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function fmtTime(t) {
  const d = new Date(t);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface-raised)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "8px 12px", fontSize: 12,
    }}>
      <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>{fmtTime(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, fontFamily: "var(--font-mono)" }}>
          {p.value?.toFixed ? p.value.toFixed(1) : p.value}{unit}
        </div>
      ))}
    </div>
  );
};

export default function LineChartCard({ title, sub, data, dataKey, color = "var(--accent)", unit = "%", height = 200, noCard = false }) {
  const chartData = (data || []).filter((point) => point[dataKey] != null && Number.isFinite(Number(point[dataKey])));

  return (
    <div className={noCard ? "" : "card"} style={noCard ? { padding: "0 8px 16px 8px" } : {}}>
      {title && (
        <div className="card-header" style={noCard ? { paddingBottom: 8, marginBottom: 8 } : {}}>
          <div>
            <div className="card-title">{title}</div>
            {sub && <div className="card-sub">{sub}</div>}
          </div>
        </div>
      )}
      {chartData.length === 0 ? (
        <div className="empty-state">Waiting for telemetry…</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-soft)" vertical={false} />
            <XAxis dataKey="t" tickFormatter={fmtTime} tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} minTickGap={40} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={34} />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#fill-${dataKey})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
