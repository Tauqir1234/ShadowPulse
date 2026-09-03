import { NavLink, useNavigate } from "react-router-dom";
import {
  IconGrid,
  IconPulse,
  IconBrain,
  IconCpu,
  IconNetwork,
  IconShield,
  IconAlert,
} from "./Icons";

const NAV = [
  { to: "/", label: "SOC Overview", sub: "Real-time telemetry & threat gauge", icon: IconGrid, end: true },
  { to: "/telemetry", label: "Telemetry & Metrics", sub: "CPU, RAM, Disk, Network streams", icon: IconPulse },
  { to: "/ml-engine", label: "AI / ML Engine", sub: "Anomaly detection & ...", icon: IconBrain, badge: "IsoForest" },
  { to: "/processes", label: "Process Sentinel", sub: "PID tracking & resource deviations", icon: IconCpu },
  { to: "/network", label: "Network Sentinel", sub: "Sockets, traffic & IP entropy", icon: IconNetwork },
  { to: "/integrity", label: "File Integrity Guard", sub: "Watchdog & ransomware bursts", icon: IconShield },
  { to: "/alerts", label: "Alert Center", sub: "Incident triage & history", icon: IconAlert, count: 1 },
];

export default function Layout({ children, agentId, connected, latest }) {
  const navigate = useNavigate();

  const currentCpu = latest?.cpu?.cpu_usage_percent ?? 18.4;
  const currentRam = latest?.memory?.used_percent ?? 42.1;
  const netIn = latest?.network?.bytes_received ?? 0;
  const netOut = latest?.network?.bytes_sent ?? 0;
  const currentNet = ((netIn + netOut) / 1024).toFixed(1);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" onClick={() => navigate("/")} style={{ cursor: "pointer", borderBottom: "none", paddingBottom: 0 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
              <IconShield width="20" height="20" />
            </div>
            <div>
              <div className="brand-word">SHADOWPULSE <span>AI-IDS</span></div>
              <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2 }}>Signature-Free Behavioural Threat Analytics</div>
            </div>
          </div>
        </div>

        <div className="nav-group" style={{ marginTop: 12 }}>
          <div className="nav-label">Security Modules</div>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              style={{ alignItems: "flex-start", padding: "10px", gap: 12 }}
            >
              <div style={{ marginTop: 2 }}><n.icon /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{n.label}</span>
                  {n.badge && (
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: n.badgeColor === 'warning' ? "var(--sev-medium-soft)" : "var(--surface-alt)", color: n.badgeColor === 'warning' ? "var(--sev-medium)" : "var(--text-secondary)", fontWeight: 700, border: "1px solid var(--border)" }}>
                      {n.badge}
                    </span>
                  )}
                  {n.count > 0 && (
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: "var(--sev-critical)", color: "#fff", fontWeight: 700 }}>
                      {n.count}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, letterSpacing: "0.01em" }}>{n.sub}</div>
              </div>
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div className={`status-dot ${connected ? "" : "critical"}`} style={{ width: 6, height: 6 }} />
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Agent Status:</span>
            </div>
            <span style={{ color: connected ? "var(--sev-low)" : "var(--sev-critical)", fontWeight: 700, fontSize: 10 }}>{connected ? "ONLINE" : "OFFLINE"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span>Engine:</span>
            <span style={{ color: "var(--pulse)", fontWeight: 600 }}>IsoForest ML v1.2</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span>Storage:</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>MongoDB Atlas</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar" style={{ padding: "12px 24px", background: "var(--surface)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          </div>
          
          <div className="topbar-right">
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
              <IconAlert width={14} height={14} />
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>1</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8, textAlign: "right", lineHeight: 1.3 }}>
              {new Date().toLocaleTimeString()}<br/>
              (REALTIME)
            </div>
          </div>
        </header>

        {agentId && (
          <div style={{ padding: "12px 26px", borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
               <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--surface-alt)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
                  <IconGrid width={20} height={20} color="var(--pulse)" />
               </div>
               <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.02em" }}>DESKTOP-SEC-NODE01</span>
                    <span style={{ fontSize: 9, padding: "2px 6px", background: "var(--sev-low-soft)", color: "var(--sev-low)", fontWeight: 700, borderRadius: 4, border: "1px solid var(--sev-low)" }}>PROTECTED</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                    Windows 11 Pro 64-bit (23H2) • <span style={{ color: "var(--pulse)", fontWeight: 600 }}>192.168.1.142</span> • Uptime: 14 days, 6 hours, 32 mins
                  </div>
               </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 10px", background: "var(--surface-alt)", borderRadius: 6, border: "1px solid var(--border)" }}>
                <IconCpu width={14} height={14} color="var(--pulse)" /> CPU: <span style={{ fontWeight: 700 }}>{currentCpu.toFixed(1)}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 10px", background: "var(--surface-alt)", borderRadius: 6, border: "1px solid var(--border)" }}>
                <IconGrid width={14} height={14} color="var(--accent)" /> RAM: <span style={{ fontWeight: 700 }}>{currentRam.toFixed(1)}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 10px", background: "var(--surface-alt)", borderRadius: 6, border: "1px solid var(--border)" }}>
                <IconNetwork width={14} height={14} color="var(--sev-low)" /> NET: <span style={{ fontWeight: 700 }}>{currentNet} KB/s</span>
              </div>
            </div>
          </div>
        )}

        <div className="content">
          {children}
        </div>
      </main>
    </div>
  );
}
