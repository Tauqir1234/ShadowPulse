import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";

export default function Database({ agentId }) {
  const [collections, setCollections] = useState({});
  const [selectedCollection, setSelectedCollection] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    api.databaseCollections(agentId, 100)
      .then((res) => {
        const next = res.data.collections || {};
        setCollections(next);
        setSelectedCollection((current) => current || Object.keys(next)[0] || "");
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [agentId]);

  return (
    <Layout title="Database" subtitle="Raw MongoDB Telemetry Data" agentId={agentId} connected={true}>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-soft)", background: "var(--surface)" }}>
          <div className="card-title">MongoDB Collections</div>
          <div className="card-sub">Recent documents stored for this agent</div>
        </div>
        <div className="flex gap-8" style={{ padding: "12px 20px", overflowX: "auto", borderBottom: "1px solid var(--border-soft)" }}>
          {Object.keys(collections).map((name) => (
            <button key={name} className={`btn small ${selectedCollection === name ? "primary" : ""}`} onClick={() => setSelectedCollection(name)}>
              {name} ({collections[name].length})
            </button>
          ))}
        </div>
        <div style={{ overflowX: "auto" }}>
          {loading ? <div className="empty-state">Loading MongoDB collections...</div> : !selectedCollection ? <div className="empty-state">No stored data found.</div> : (
            <pre style={{ margin: 0, padding: 20, maxHeight: 620, overflow: "auto", fontSize: 11, lineHeight: 1.5, color: "var(--text-secondary)" }}>
              {JSON.stringify(collections[selectedCollection], null, 2)}
            </pre>
          )}
        </div>
      </div>
    </Layout>
  );
}
