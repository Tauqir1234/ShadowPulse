import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import AlertsPanel from "../components/AlertsPanel";
import { api } from "../lib/api";

const FILTERS = ["All", "Open", "Acknowledged", "Resolved"];

export default function Alerts({ agentId }) {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("All");

  function load() {
    if (!agentId) return;
    api.alerts(agentId, filter === "All" ? undefined : filter).then((r) => setAlerts(r.data.alerts)).catch(() => {});
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, filter]);

  async function handleAck(alertId, status) {
    await api.ackAlert(alertId, status);
    load();
  }

  return (
    <Layout title="Alerts" subtitle="Investigate and triage flagged behavior" agentId={agentId}>
      <div className="flex gap-8">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`btn small ${filter === f ? "primary" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <AlertsPanel alerts={alerts} onAck={handleAck} />
    </Layout>
  );
}
