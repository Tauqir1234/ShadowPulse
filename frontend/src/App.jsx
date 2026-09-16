import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Processes from "./pages/Processes";
import Network from "./pages/Network";
import FileIntegrity from "./pages/FileIntegrity";
import AlertCenter from "./pages/AlertCenter";
import History from "./pages/History";
import Database from "./pages/Database";
import MLEngine from "./pages/MLEngine";
import { api } from "./lib/api";

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem("shadowpulse_token"));
  useEffect(() => {
    const onStorage = () => setToken(localStorage.getItem("shadowpulse_token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return { token, refresh: () => setToken(localStorage.getItem("shadowpulse_token")) };
}

function RequireAuth({ token, children }) {
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { token, refresh } = useAuth();
  // Single-agent focus for this build; swap for a dropdown once multiple
  // endpoints are onboarded (NFR5 Scalability covers the multi-agent path).
  const [agentId, setAgentId] = useState(
    localStorage.getItem("shadowpulse_agent_id") || import.meta.env.VITE_DEFAULT_AGENT_ID || ""
  );

  useEffect(() => {
    api.agents().then(({ data }) => {
      const activeAgent = data.agents?.[0]?.agent_id;
      if (activeAgent && activeAgent !== agentId) {
        localStorage.setItem("shadowpulse_agent_id", activeAgent);
        setAgentId(activeAgent);
      }
    }).catch(() => {});
  }, [agentId]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={refresh} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<RequireAuth token={token}><Dashboard agentId={agentId} /></RequireAuth>} />
        <Route path="/ml-engine" element={<RequireAuth token={token}><MLEngine agentId={agentId} /></RequireAuth>} />
        <Route path="/processes" element={<RequireAuth token={token}><Processes agentId={agentId} /></RequireAuth>} />
        <Route path="/network" element={<RequireAuth token={token}><Network agentId={agentId} /></RequireAuth>} />
        <Route path="/integrity" element={<RequireAuth token={token}><FileIntegrity agentId={agentId} /></RequireAuth>} />
        <Route path="/alerts" element={<RequireAuth token={token}><AlertCenter agentId={agentId} /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth token={token}><History agentId={agentId} /></RequireAuth>} />
        <Route path="/database" element={<RequireAuth token={token}><Database agentId={agentId} /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
