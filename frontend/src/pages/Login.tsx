import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { access_token } = await apiLogin({ username, password });
      login(access_token);
      navigate("/");
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ display: "flex", justifyContent: "center", paddingTop: "5rem" }}>
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <h2 style={{ marginBottom: "1.5rem", fontSize: "1.25rem" }}>Sign in</h2>
        <form onSubmit={handleSubmit} className="flex-col">
          <div className="form-group">
            <label htmlFor="username">Username or email</label>
            <input
              id="username"
              placeholder="admin or admin@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: ".25rem" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
