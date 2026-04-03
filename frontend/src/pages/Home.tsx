import { useEffect, useState } from "react";
import { fetchHealth, type HealthResponse } from "../api/client";

type Status = "loading" | "ok" | "degraded" | "error";

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

  const badge: Record<Status, { label: string; color: string }> = {
    loading: { label: "Checking...", color: "#888" },
    ok: { label: "Online", color: "#22c55e" },
    degraded: { label: "Degraded", color: "#f59e0b" },
    error: { label: "Offline", color: "#ef4444" },
  };

  const { label, color } = badge[status];

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem", maxWidth: 600 }}>
      <h1>skeleton-web</h1>
      <p>
        Backend status:{" "}
        <span
          style={{
            background: color,
            color: "#fff",
            padding: "2px 10px",
            borderRadius: 4,
            fontWeight: "bold",
          }}
        >
          {label}
        </span>
      </p>
      {data && (
        <pre style={{ background: "#f4f4f4", padding: "1rem", borderRadius: 4 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
