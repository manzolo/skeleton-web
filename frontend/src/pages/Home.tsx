import { useEffect, useState } from "react";
import { fetchHealth, type HealthResponse } from "../api/client";

type Status = "loading" | "ok" | "degraded" | "error";

const STATUS_STYLE: Record<Status, { label: string; color: string }> = {
  loading:  { label: "Checking…", color: "var(--muted)" },
  ok:       { label: "Online",    color: "var(--success)" },
  degraded: { label: "Degraded",  color: "var(--warning)" },
  error:    { label: "Offline",   color: "var(--danger)" },
};

export default function Home() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetchHealth()
      .then((res) => {
        setData(res);
        setStatus(res.status === "ok" ? "ok" : "degraded");
      })
      .catch(() => setStatus("error"));
  }, []);

  const { label, color } = STATUS_STYLE[status];

  return (
    <div className="page">
      <h1 style={{ fontSize: "1.5rem", marginBottom: ".25rem" }}>skeleton-web</h1>
      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
        FastAPI + React + PostgreSQL template
      </p>

      <div className="card" style={{ maxWidth: 400 }}>
        <p style={{ marginBottom: ".75rem", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)" }}>
          API status
        </p>
        <p className="status-dot" style={{ color, fontSize: "15px" }}>{label}</p>
        {data && (
          <pre style={{ marginTop: "1rem", background: "var(--bg)", padding: ".75rem 1rem", borderRadius: "var(--radius)", fontSize: "12px", color: "var(--muted)", border: "1px solid var(--border)" }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>

      <div className="card mt-3" style={{ maxWidth: 400 }}>
        <p style={{ marginBottom: ".75rem", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)" }}>
          Default credentials
        </p>
        <table style={{ width: "auto" }}>
          <tbody>
            <tr><td style={{ paddingRight: "1rem", color: "var(--muted)", paddingTop: 4, paddingBottom: 4 }}>Username</td><td><code>admin</code></td></tr>
            <tr><td style={{ color: "var(--muted)", paddingTop: 4, paddingBottom: 4 }}>Email</td><td><code>admin@example.com</code></td></tr>
            <tr><td style={{ color: "var(--muted)", paddingTop: 4, paddingBottom: 4 }}>Password</td><td><code>changeme</code></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
