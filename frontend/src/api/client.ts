const BASE_URL = "/api";

export interface HealthResponse {
  status: "ok" | "degraded";
  database: "ok" | "degraded";
  env: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<HealthResponse>;
}
