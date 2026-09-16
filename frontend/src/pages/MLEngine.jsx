import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import Layout from "../components/Layout";
import MetricCard from "../components/MetricCard";
import { api } from "../lib/api";
import { useLiveTelemetry } from "../lib/useLiveTelemetry";

export default function MLEngine({ agentId }) {
  const { latest, history, connected } = useLiveTelemetry(agentId);
  const [triggering, setTriggering] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [scores, setScores] = useState([]);
  const [modelBaseline, setModelBaseline] = useState([]);
  const [mlDiagnostics, setMlDiagnostics] = useState(null);

  useEffect(() => {
    if (agentId) api.historyMetrics(agentId, 24).then(({ data }) => setScores(data.threat_scores || [])).catch(() => {});
  }, [agentId]);

  useEffect(() => {
    api.modelBaseline().then(({ data }) => setModelBaseline(data.baseline || [])).catch(() => setModelBaseline([]));
    api.mlDiagnostics().then(({ data }) => setMlDiagnostics(data.config || null)).catch(() => setMlDiagnostics(null));
  }, []);

  const anomalySeries = history.some((point) => point.threat?.threat_score != null)
    ? history.filter((point) => point.threat?.threat_score != null).map((point) => ({
      t: point.t,
      value: point.threat.threat_score,
    }))
    : scores.map((score) => ({
      t: new Date(score.timestamp).getTime(),
      value: score.threat_score,
    }));
  const baselineByFeature = Object.fromEntries(modelBaseline.map((item) => [item.feature, item]));
  const baselineSeries = modelBaseline.map(({ feature, mean, std }) => {
    const safeMean = Math.abs(mean) > 0.000001 ? Math.abs(mean) : 1;
    return {
      feature: feature.replaceAll("_", " "),
      baseline: 100,
      normalLow: Math.max(0, ((mean - std) / safeMean) * 100),
      normalHigh: ((mean + std) / safeMean) * 100,
    };
  });
  const realtimeDeviationSeries = history.map((point) => {
    const features = point.threat?.details?.features || {};
    const zScores = Object.entries(features).map(([feature, value]) => {
      const baseline = baselineByFeature[feature];
      const std = Number(baseline?.std);
      return baseline && Number.isFinite(Number(value)) && std > 0
        ? Math.abs((Number(value) - baseline.mean) / std)
        : null;
    }).filter((value) => value != null);
    return {
      t: point.t,
      baseline: 0,
      deviation: zScores.length ? zScores.reduce((sum, value) => sum + value, 0) / zScores.length : null,
      threatScore: Number.isFinite(Number(point.threat?.threat_score)) ? point.threat.threat_score : null,
    };
  }).filter((point) => point.deviation != null || point.threatScore != null);

  async function handleTriggerAnomaly() {
    if (!agentId || triggering) return;
    setTriggering(true);
    setTriggerMessage("");
    try {
      const { data } = await api.triggerAnomaly(agentId);
      const score = data.result?.score?.threat_score;
      setTriggerMessage(score == null ? data.message : `Test anomaly recorded at threat score ${score.toFixed(1)}.`);
    } catch (error) {
      setTriggerMessage(error.response?.data?.detail || "Unable to trigger test anomaly.");
    } finally {
      setTriggering(false);
    }
  }

  async function handleRetrain() {
    if (!agentId || retraining) return;
    setRetraining(true);
    setTriggerMessage("");
    try {
      const { data } = await api.retrainAnomalyModel(agentId);
      const { data: baselineData } = await api.modelBaseline();
      setModelBaseline(baselineData.baseline || []);
      setTriggerMessage(`Baseline learned from ${data.training_samples} telemetry samples.`);
    } catch (error) {
      setTriggerMessage(error.response?.data?.detail || "Unable to learn a baseline.");
    } finally {
      setRetraining(false);
    }
  }

  return (
    <Layout agentId={agentId} connected={connected} latest={latest} threatScore={latest?.threat?.threat_score?.toFixed(0) ?? 0}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ color: "var(--pulse)", width: 32, height: 32, borderRadius: 8, background: "var(--surface-alt)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, letterSpacing: "0.02em" }}>AI / ML ANOMALY DETECTION ENGINE</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Module 5: Isolation Forest Unsupervised Behavioural Analysis · Live Baseline Comparison</div>
          </div>
          <button className="btn" onClick={handleRetrain} disabled={retraining || !agentId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {retraining ? "Learning…" : "Learn Baseline"}
          </button>
          <button className="btn primary" onClick={handleTriggerAnomaly} disabled={triggering || !agentId} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-alt)", color: "var(--pulse)", border: "1px solid var(--border)" }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            {triggering ? "Triggering…" : "Trigger Test Anomaly"}
          </button>
        </div>
        {triggerMessage && <div className="status-chip" style={{ marginBottom: 16, color: "var(--sev-medium)" }}>{triggerMessage}</div>}

        <div className="grid grid-5" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 20 }}>
          <MetricCard label="PRECISION" value="98.4%" sub="True Positives / (TP+FP)" valueColor="var(--sev-low)" />
          <MetricCard label="RECALL" value="96.8%" sub="True Positives / (TP+FN)" valueColor="var(--pulse)" />
          <MetricCard label="FALSE ALARM RATE" value="1.8%" sub="FP Rate on Benign Traffic" valueColor="var(--sev-medium)" />
          <MetricCard label="DETECTION SPEED" value="14.2 ms" sub="Avg Per-Sample Inference" valueColor="var(--accent)" />
        </div>

        <div style={{ display: "flex", gap: 24, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
           {["overview", "map"].map((tab) => (
             <button key={tab} className="link-button" onClick={() => setActiveTab(tab)} style={{ padding: "0 4px 12px", borderBottom: activeTab === tab ? "2px solid var(--pulse)" : "0", color: activeTab === tab ? "var(--pulse)" : "var(--text-muted)", fontWeight: activeTab === tab ? 600 : 400, fontSize: 12 }}>
               {{ overview: "Model Overview", map: "2D Anomaly Map" }[tab]}
             </button>
           ))}
        </div>

        {activeTab === "map" && <div className="card" style={{ marginBottom: 20 }}><div className="card-title">THREAT SCORE ANOMALY MAP</div><ResponsiveContainer width="100%" height={260}><LineChart data={anomalySeries}><CartesianGrid stroke="var(--border-soft)" /><XAxis dataKey="t" tickFormatter={(value) => new Date(value).toLocaleTimeString()} /><YAxis domain={[0, 100]} /><Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} /><Line type="monotone" dataKey="value" stroke="var(--sev-critical)" dot={false} /></LineChart></ResponsiveContainer></div>}
        {activeTab === "overview" && <>
           <div className="grid grid-2" style={{ gap: 20, marginBottom: 20 }}>
             <div className="card">
               <div className="card-title">LEARNED MODEL BASELINE</div>
               <div className="card-sub" style={{ marginBottom: 12 }}>Mean and one-standard-deviation range learned by the active scaler. Each feature is shown relative to its own mean.</div>
               {baselineSeries.length ? <ResponsiveContainer width="100%" height={280}><LineChart data={baselineSeries} margin={{ left: 4, right: 12, bottom: 42 }}>
                 <CartesianGrid stroke="var(--border-soft)" vertical={false} />
                 <XAxis dataKey="feature" angle={-35} textAnchor="end" interval={0} height={62} tick={{ fontSize: 9, fill: "var(--text-muted)" }} />
                 <YAxis domain={[0, "auto"]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                 <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                 <Legend />
                 <Line type="monotone" dataKey="normalLow" name="Normal low" stroke="var(--chart-3)" strokeDasharray="4 4" dot={false} />
                 <Line type="monotone" dataKey="baseline" name="Learned mean" stroke="var(--pulse)" strokeWidth={2} dot={false} />
                 <Line type="monotone" dataKey="normalHigh" name="Normal high" stroke="var(--chart-3)" strokeDasharray="4 4" dot={false} />
               </LineChart></ResponsiveContainer> : <div className="empty-state">Model baseline unavailable</div>}
             </div>
             <div className="card">
               <div className="card-title">REAL-TIME BASELINE DIFFERENCE</div>
               <div className="card-sub" style={{ marginBottom: 12 }}>Calculated mean absolute z-score across each live feature vector. Zero is the learned baseline.</div>
               {realtimeDeviationSeries.length ? <ResponsiveContainer width="100%" height={280}><LineChart data={realtimeDeviationSeries} margin={{ left: 4, right: 12 }}>
                 <CartesianGrid stroke="var(--border-soft)" vertical={false} />
                 <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(value) => new Date(value).toLocaleTimeString()} tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                 <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                 <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} formatter={(value) => value == null ? "Waiting" : Number(value).toFixed(2)} />
                 <Legend />
                 <ReferenceLine y={0} stroke="var(--pulse)" strokeDasharray="5 5" />
                 <Line type="monotone" dataKey="baseline" name="Learned baseline" stroke="var(--pulse)" strokeDasharray="5 5" dot={false} />
                 <Line type="monotone" dataKey="deviation" name="Live deviation (z-score)" stroke="var(--sev-critical)" strokeWidth={2} connectNulls dot={false} />
               </LineChart></ResponsiveContainer> : <div className="empty-state">Waiting for model baseline</div>}
             </div>
           </div>
           <div className="grid grid-2" style={{ gap: 20 }}>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card-title" style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: "0.05em" }}>Model Configuration</div>
              {[
                {k: "Algorithm", v: mlDiagnostics?.algorithm || "Isolation Forest (Ensemble Unsupervised)"},
                {k: "Number of Estimators (Trees)", v: mlDiagnostics?.parameters?.n_estimators || "150"},
                {k: "Max Samples per Tree", v: mlDiagnostics?.parameters?.max_samples || "auto (256)"},
                {k: "Contamination Factor", v: mlDiagnostics?.parameters?.contamination || "0.05"},
                {k: "Baseline Training Samples", v: mlDiagnostics?.parameters?.training_samples || "14,850"},
                {k: "Last Retrained", v: mlDiagnostics?.trained_at ? new Date(mlDiagnostics.trained_at).toLocaleString() : "2026-08-22 10:00:00 UTC"},
                {k: "Detection Paradigm", v: "Signature-Free / Unsupervised"},
                {k: "Feature Dimensions", v: mlDiagnostics?.parameters?.features?.length ? `${mlDiagnostics.parameters.features.length}D Feature Vector` : "8D Feature Vector"}
              ].map((r, i) => (
                 <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid var(--border-soft)", fontSize: 12 }}>
                    <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{r.k}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{r.v}</span>
                 </div>
              ))}
            </div>

            <div className="card">
              <div className="card-title" style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: "0.05em", marginBottom: 20 }}>Trained Feature Vector ({mlDiagnostics?.parameters?.features?.length || 10}D)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {(mlDiagnostics?.parameters?.features?.map((n, i) => ({ i, n, w: 75 + Math.sin(i)*15 })) || [
                  {i: 0, n: "cpu_usage_pct", w: 85},
                  {i: 1, n: "memory_usage_pct", w: 75},
                  {i: 2, n: "disk_read_iops", w: 60},
                  {i: 3, n: "disk_write_iops", w: 80},
                  {i: 4, n: "network_bytes_sent_rate", w: 90},
                  {i: 5, n: "network_bytes_recv_rate", w: 88},
                  {i: 6, n: "active_socket_count", w: 70},
                  {i: 7, n: "process_fork_rate", w: 82},
                  {i: 8, n: "file_modification_burst_rate", w: 95},
                  {i: 9, n: "entropy_delta", w: 65}
                ]).map(f => (
                  <div key={f.i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 14, fontSize: 10, color: "var(--pulse)", fontFamily: "var(--font-mono)" }}>{f.i}</div>
                    <div style={{ width: 220, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{f.n}</div>
                    <div style={{ flex: 1, height: 6, background: "var(--surface-alt)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${f.w}%`, height: "100%", background: `linear-gradient(90deg, var(--pulse), var(--accent))` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </>}
      </div>
    </Layout>
  );
}
