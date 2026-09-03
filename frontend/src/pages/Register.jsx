import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PulseMark } from "../components/PulseMark";
import { api } from "../lib/api";

export default function Register() {
  const [form, setForm] = useState({ username: "", fullName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.register(form.username.trim(), form.password, form.fullName.trim(), form.email.trim());
      setSuccess("Account created. You can sign in now.");
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not create the account.");
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
            <div className="brand-word" style={{ fontSize: 19 }}>SHADOW<span>PULSE</span></div>
            <div className="brand-tag">Behavioral Intrusion Detection</div>
          </div>
        </div>

        <div className="card-title" style={{ marginBottom: 4 }}>Create your account</div>
        <div className="card-sub" style={{ marginBottom: 16 }}>Set up access to the monitoring dashboard.</div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="register-username">Username</label>
            <input id="register-username" value={form.username} onChange={update("username")} autoFocus required />
          </div>
          <div className="field">
            <label htmlFor="register-name">Full name</label>
            <input id="register-name" value={form.fullName} onChange={update("fullName")} />
          </div>
          <div className="field">
            <label htmlFor="register-email">Email</label>
            <input id="register-email" type="email" value={form.email} onChange={update("email")} />
          </div>
          <div className="field">
            <label htmlFor="register-password">Password</label>
            <input id="register-password" type="password" value={form.password} onChange={update("password")} minLength={8} required />
          </div>
          <div className="field">
            <label htmlFor="register-confirm">Confirm password</label>
            <input id="register-confirm" type="password" value={form.confirmPassword} onChange={update("confirmPassword")} required />
          </div>
          {error && <div className="error-text">{error}</div>}
          {success && <div className="success-text">{success}</div>}
          <button className="btn primary" type="submit" style={{ width: "100%", marginTop: 6 }} disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <div className="text-muted" style={{ fontSize: 11.5, marginTop: 18, textAlign: "center" }}>
          Already registered? <button className="link-button" type="button" onClick={() => navigate("/login")}>Sign in</button>
        </div>
      </div>
    </div>
  );
}