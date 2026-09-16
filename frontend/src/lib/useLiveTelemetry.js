import { useEffect, useRef, useState } from "react";
import { api, WS_URL } from "./api";

/**
 * Subscribes to /ws/{agentId} and keeps the latest snapshot plus a
 * rolling history buffer (for sparkline-style charts) in state.
 * Falls back gracefully — the rest of the dashboard still works from
 * REST polling if the socket can't connect (e.g. no backend running yet).
 */
export function useLiveTelemetry(agentId, historyLength = 500) {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;

    api.historyMetrics(agentId, 24).then(({ data }) => {
      if (cancelled) return;
      const points = new Map();
      const add = (rows, key) => rows.forEach((row) => {
        const timestamp = new Date(row.timestamp).getTime();
        if (!Number.isNaN(timestamp)) {
          points.set(timestamp, { ...(points.get(timestamp) || {}), t: timestamp, [key]: row });
        }
      });
      add(data.cpu || [], "cpu");
      add(data.memory || [], "memory");
      add(data.network || [], "network");
      add(data.threat_scores || [], "threat");
      setHistory([...points.values()].sort((a, b) => a.t - b.t).slice(-historyLength));
    }).catch(() => {});

    function connect() {
      const ws = new WebSocket(`${WS_URL}/ws/${agentId}`);
      wsRef.current = ws;

      ws.onopen = () => !cancelled && setConnected(true);
      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        setTimeout(connect, 3000); // auto-reconnect
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          const sourceTimestamp = data.timestamp || data.threat?.timestamp || data.cpu?.timestamp || data.memory?.timestamp || data.network?.timestamp;
          const timestamp = new Date(sourceTimestamp).getTime();
          setLatest(data);
          if (Number.isNaN(timestamp)) return;
          setHistory((prev) => {
            const point = {
              ...data,
              t: timestamp,
              cpu: data.cpu?.cpu_usage_percent,
              memory: data.memory?.used_percent,
              network: data.network,
              threat: data.threat?.threat_score,
            };
            const next = [...prev.filter((item) => item.t !== timestamp), point];
            return next.sort((a, b) => a.t - b.t).slice(-historyLength);
          });
        } catch {
          /* ignore malformed frame */
        }
      };
    }

    connect();
    return () => {
      cancelled = true;
      wsRef.current?.close();
    };
  }, [agentId, historyLength]);

  return { latest, history, connected };
}
