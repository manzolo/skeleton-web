const BASE_URL = "/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ---- Health ----------------------------------------------------------------

export interface HealthResponse {
  status: "ok" | "degraded";
  database: "ok" | "degraded";
  env: string;
}

export function fetchHealth(): Promise<HealthResponse> {
  return apiFetch("/health");
}

// ---- Permissions -----------------------------------------------------------

export interface Permission {
  id: number;
  name: string;
  codename: string;
}

export interface PermissionCreate {
  name: string;
  codename: string;
}

export function fetchPermissions(): Promise<Permission[]> {
  return apiFetch("/permissions/");
}

export function createPermission(payload: PermissionCreate): Promise<Permission> {
  return apiFetch("/permissions/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---- Roles -----------------------------------------------------------------

export interface Role {
  id: number;
  name: string;
  slug: string;
  permissions: Permission[];
}

export interface RoleCreate {
  name: string;
  slug: string;
}

export function fetchRoles(): Promise<Role[]> {
  return apiFetch("/roles/");
}

export function createRole(payload: RoleCreate): Promise<Role> {
  return apiFetch("/roles/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---- Users -----------------------------------------------------------------

export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
  role: Role | null;
}

export interface UserCreate {
  email: string;
  username: string;
  password?: string;
  role_id?: number;
}

export function fetchUsers(): Promise<User[]> {
  return apiFetch("/users/");
}

export function createUser(payload: UserCreate): Promise<User> {
  return apiFetch("/users/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
