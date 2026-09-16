import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";
import { useLiveTelemetry } from "../lib/useLiveTelemetry";

export default function AlertCenter({ agentId }) {
  const { latest, connected } = useLiveTelemetry(agentId);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!agentId) return;
    const load = () => api.alerts(agentId).then(({ data }) => setAlerts(data.alerts || [])).catch(() => {});
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [agentId]);

  async function exportAlertsPDF() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const PAGE_W = 210;
    const MARGIN = 14;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    let y = 0;

    const SEV_COLORS = {
      Critical: [220, 53, 69],
      High:     [255, 140, 0],
      Medium:   [255, 193, 7],
      Low:      [40, 167, 69],
    };

    function newPage() {
      doc.addPage();
      y = 14;
    }

    function checkY(needed = 10) {
      if (y + needed > 280) newPage();
    }

    // ── Header banner ────────────────────────────────────────────────────────
    doc.setFillColor(10, 10, 30);
    doc.rect(0, 0, PAGE_W, 28, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(80, 180, 255);
    doc.text("SHADOWPULSE", MARGIN, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(160, 170, 185);
    doc.text("Security Alert Report — Incident Triage & Forensic History", MARGIN, 19);

    doc.setFontSize(8);
    doc.setTextColor(120, 130, 145);
    doc.text(`Generated: ${new Date().toLocaleString()}`, MARGIN, 25);
    doc.text(`Agent: ${agentId}`, PAGE_W - MARGIN - 60, 25);

    y = 36;

    // ── Summary bar ──────────────────────────────────────────────────────────
    const open = alerts.filter(a => a.status === "Open").length;
    const acked = alerts.filter(a => a.status === "Acknowledged").length;
    const resolved = alerts.filter(a => a.status === "Resolved").length;

    const sumItems = [
      { label: "Total Alerts", val: alerts.length, color: [80, 180, 255] },
      { label: "Open",         val: open,           color: [220, 53, 69] },
      { label: "Acknowledged", val: acked,          color: [255, 140, 0] },
      { label: "Resolved",     val: resolved,       color: [40, 167, 69] },
    ];
    const boxW = CONTENT_W / sumItems.length;
    sumItems.forEach((item, i) => {
      const x = MARGIN + i * boxW;
      doc.setFillColor(20, 24, 40);
      doc.roundedRect(x, y, boxW - 4, 18, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...item.color);
      doc.text(String(item.val), x + (boxW - 4) / 2, y + 10, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(150, 155, 165);
      doc.text(item.label, x + (boxW - 4) / 2, y + 16, { align: "center" });
    });

    y += 26;

    // ── Divider ──────────────────────────────────────────────────────────────
    doc.setDrawColor(40, 50, 70);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;

    // ── Alert cards ──────────────────────────────────────────────────────────
    alerts.forEach((a, idx) => {
      const sevColor = SEV_COLORS[a.severity] || [120, 120, 120];
      const suggestions = a.suggestions || [];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const mainText = a.reasoning || a.description || "";
      const mainLines = doc.splitTextToSize(mainText, CONTENT_W - 16);
      
      let cardH = 26 + (mainLines.length * 3.5) + 6;
      if (!a.reasoning && suggestions.length > 0) {
        cardH += 5 + suggestions.length * 4.5 + 4;
      }

      checkY(cardH);

      // card bg
      doc.setFillColor(18, 22, 36);
      doc.roundedRect(MARGIN, y, CONTENT_W, cardH, 3, 3, "F");

      // left severity stripe
      doc.setFillColor(...sevColor);
      doc.rect(MARGIN, y, 3, cardH, "F");

      // severity badge
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...sevColor);
      doc.text(a.severity?.toUpperCase() || "UNKNOWN", MARGIN + 7, y + 7);

      // status badge
      const statusColor = a.status === "Open" ? [220, 53, 69] : a.status === "Acknowledged" ? [255, 140, 0] : [40, 167, 69];
      doc.setFillColor(...statusColor, 40);
      const badgeX = PAGE_W - MARGIN - 28;
      doc.roundedRect(badgeX, y + 3, 26, 6, 2, 2, "F");
      doc.setTextColor(...statusColor);
      doc.setFontSize(6.5);
      doc.text(a.status || "", badgeX + 13, y + 7.2, { align: "center" });

      // title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(220, 225, 235);
      doc.text(a.title || "Untitled Alert", MARGIN + 7, y + 13);

      // meta row
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(110, 120, 140);
      const ts = a.created_at ? new Date(a.created_at).toLocaleString() : "—";
      doc.text(`#${idx + 1}  •  ID: ${(a.alert_id || "").slice(0, 8)}…  •  ${ts}  •  Source: ${a.alert_type || "—"}  •  Threat Score: ${a.threat_score ?? 0}%`, MARGIN + 7, y + 18.5);

      // reasoning or description
      doc.setFont("helvetica", a.reasoning ? "normal" : "italic");
      doc.setFontSize(8);
      doc.setTextColor(155, 165, 180);
      doc.text(mainLines, MARGIN + 7, y + 24);

      // suggestions (only if no reasoning, to avoid duplication since reasoning includes it)
      if (!a.reasoning && suggestions.length > 0) {
        const sugY = y + 24 + (mainLines.length * 3.5) + 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(80, 180, 255);
        doc.text("AI REMEDIATION STEPS:", MARGIN + 7, sugY);
        suggestions.forEach((s, si) => {
          const lineY = sugY + 4 + si * 4.5;
          doc.setFillColor(80, 180, 255);
          doc.circle(MARGIN + 9, lineY - 0.5, 0.8, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(190, 200, 215);
          const sLines = doc.splitTextToSize(s, CONTENT_W - 22);
          doc.text(sLines, MARGIN + 12, lineY);
        });
      }

      y += cardH + 4;
    });

    // ── Footer on each page ───────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setDrawColor(40, 50, 70);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, 288, PAGE_W - MARGIN, 288);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(80, 90, 110);
      doc.text("ShadowPulse Security Platform — Confidential", MARGIN, 293);
      doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN, 293, { align: "right" });
    }

    doc.save(`shadowpulse-alert-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  async function updateAlert(alert) {
    const status = alert.status === "Open" ? "Acknowledged" : "Resolved";
    await api.ackAlert(alert.alert_id, status);
    setAlerts((current) => current.map((item) => item.alert_id === alert.alert_id ? { ...item, status } : item));
  }

  async function clearHistory() {
    if (!window.confirm("Clear all alert history for this agent? This cannot be undone.")) return;
    await api.clearAlerts(agentId).catch(() => {});
    setAlerts([]);
  }

  return (
    <Layout agentId={agentId} connected={connected} latest={latest} threatScore={latest?.threat?.threat_score?.toFixed(0) ?? 0}>
      <div>
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ color: "var(--sev-medium)" }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>ALERT CENTER — INCIDENT TRIAGE &amp; FORENSIC HISTORY</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Severity-ranked alerts, analyst workflow &amp; PDF report export</div>
          </div>
          <button onClick={exportAlertsPDF} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "8px 16px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text-primary)", cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export PDF Report
          </button>
          <button onClick={clearHistory} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "8px 16px", borderRadius: 4, border: "1px solid var(--sev-critical)", background: "color-mix(in srgb, var(--sev-critical) 10%, transparent)", color: "var(--sev-critical)", cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Clear History
          </button>
        </div>

        {/* ── Filter bar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <svg style={{ position: "absolute", left: 12, top: 10, color: "var(--text-muted)" }} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search alerts..." style={{ width: "100%", background: "var(--surface-alt)", border: "1px solid var(--border)", padding: "8px 12px 8px 36px", borderRadius: 20, color: "var(--text-primary)", fontSize: 12 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg> Severity:
              <span style={{ padding: "4px 8px", border: "1px solid var(--pulse)", borderRadius: 12, color: "var(--pulse)", fontWeight: 600 }}>All</span>
              <span style={{ color: "var(--text-muted)" }}>Critical</span>
              <span style={{ color: "var(--text-muted)" }}>High</span>
              <span style={{ color: "var(--text-muted)" }}>Medium</span>
              <span style={{ color: "var(--text-muted)" }}>Low</span>
            </div>
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Status:
              <span style={{ padding: "4px 8px", border: "1px solid var(--pulse)", borderRadius: 12, color: "var(--pulse)", fontWeight: 600 }}>All</span>
              <span style={{ color: "var(--text-muted)" }}>Open</span>
              <span style={{ color: "var(--text-muted)" }}>Acknowledged</span>
              <span style={{ color: "var(--text-muted)" }}>Resolved</span>
            </div>
          </div>
        </div>

        {/* ── Alert list ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {alerts.length === 0 ? <div className="empty-state">No alerts stored for this agent.</div> : alerts.map((a) => {
            const sevColor = a.severity === "Critical" ? "var(--sev-critical)" : a.severity === "High" ? "var(--accent)" : a.severity === "Medium" ? "var(--sev-medium)" : "var(--sev-low)";
            return (
              <div key={a.alert_id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px", background: "var(--surface)", border: `1px solid ${sevColor}`, borderRadius: 8 }}>
                <div style={{ display: "flex", gap: 16, flex: 1 }}>
                  <div style={{ padding: "4px 8px", background: `color-mix(in srgb, ${sevColor} 15%, transparent)`, color: sevColor, fontSize: 10, fontWeight: 700, borderRadius: 4, height: "fit-content" }}>
                    {a.severity}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                      {a.title}
                      <span style={{ color: a.status === "Open" ? "var(--sev-critical)" : "var(--sev-medium)", fontSize: 10 }}>[{a.status}]</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: "var(--text-muted)" }}>
                      <span>ID: {a.alert_id}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {new Date(a.created_at).toLocaleString()}</span>
                      <span>Source: {a.alert_type}</span>
                      <span>Score: <span style={{ color: sevColor }}>{a.threat_score ?? 0}%</span></span>
                      {(a.severity === "High" || a.severity === "Critical") && (
                        <span>
                          SMS: <span style={{ color: a.sms_sent ? "var(--sev-low)" : "var(--sev-medium)" }}>{a.sms_status || "Not Sent"}</span>
                        </span>
                      )}
                    </div>
                    {a.suggestions && a.suggestions.length > 0 && (
                      <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--surface-alt)", borderRadius: 4, borderLeft: "2px solid var(--pulse)" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--pulse)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Remediation</div>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "var(--text-secondary)" }}>
                          {a.suggestions.map((s, i) => <li key={i} style={{ marginBottom: 2 }}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <button onClick={() => updateAlert(a)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "8px 12px", borderRadius: 4, fontSize: 12, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    {a.status === "Open" ? "Acknowledge" : a.status === "Acknowledged" ? "Resolve" : "Resolved"}
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
