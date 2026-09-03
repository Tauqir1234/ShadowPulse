import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PulseMark } from "../components/PulseMark";
import { api } from "../lib/api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(username, password);
      localStorage.setItem("shadowpulse_token", res.data.access_token);
      onLogin?.();
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="flex items-center gap-12" style={{ marginBottom: 22 }}>
          <PulseMark size={34} />
          <div>
            <div className="brand-word" style={{ fontSize: 19 }}>
              SHADOW<span>PULSE</span>
            </div>
            <div className="brand-tag">Behavioral Intrusion Detection</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn primary" type="submit" style={{ width: "100%", marginTop: 6 }} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="text-muted" style={{ fontSize: 11.5, marginTop: 18, textAlign: "center" }}>
          New user? <button className="link-button" type="button" onClick={() => navigate("/register")}>Create an account</button>
        </div>
      </div>
    </div>
  );
}
