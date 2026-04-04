const BASE_URL = "/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return undefined as T;
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

export function updateUser(id: number, payload: UserCreate): Promise<User> {
  return apiFetch(`/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: number): Promise<void> {
  return apiFetch(`/users/${id}`, { method: "DELETE" });
}

// ---- Auth ------------------------------------------------------------------

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  role: Role | null;
}

export function login(payload: LoginRequest): Promise<TokenResponse> {
  return apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchMe(): Promise<CurrentUser> {
  return apiFetch("/auth/me");
}