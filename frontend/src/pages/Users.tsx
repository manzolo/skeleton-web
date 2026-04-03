import { useEffect, useReducer, useState } from "react";
import { createUser, fetchRoles, fetchUsers, type Role, type User, type UserCreate } from "../api/client";

type State =
  | { status: "loading" }
  | { status: "ok"; users: User[]; roles: Role[] }
  | { status: "error"; message: string };

type Action =
  | { type: "loaded"; users: User[]; roles: Role[] }
  | { type: "error"; message: string }
  | { type: "add"; user: User };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loaded":
      return { status: "ok", users: action.users, roles: action.roles };
    case "error":
      return { status: "error", message: action.message };
    case "add":
      if (state.status !== "ok") return state;
      return { ...state, users: [...state.users, action.user] };
  }
}

const PERM_COLORS = ["badge-sky", "badge-green", "badge-amber", "badge-red"];

const badge = (text: string, cls: string) => (
  <span key={text} className={`badge ${cls}`} style={{ marginRight: 4 }}>
    {text}
  </span>
);

export default function Users() {
  const [state, dispatch] = useReducer(reducer, { status: "loading" });
  const [form, setForm] = useState<UserCreate>({ email: "", username: "", password: "", role_id: undefined });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchRoles()])
      .then(([users, roles]) => dispatch({ type: "loaded", users, roles }))
      .catch((e: Error) => dispatch({ type: "error", message: e.message }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: UserCreate = {
        email: form.email,
        username: form.username,
        ...(form.password ? { password: form.password } : {}),
        ...(form.role_id ? { role_id: form.role_id } : {}),
      };
      const user = await createUser(payload);
      dispatch({ type: "add", user });
      setForm({ email: "", username: "", password: "", role_id: undefined });
    } catch {
      alert("Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  }

  if (state.status === "loading") return <p className="text-muted" style={{ padding: "2rem 1.5rem" }}>Loading users…</p>;
  if (state.status === "error") return <p className="error-msg" style={{ padding: "2rem 1.5rem" }}>Error: {state.message}</p>;

  const { users, roles } = state;

  return (
    <div className="page">
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Users</h1>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        {users.length === 0 ? (
          <p className="text-muted">No users yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Permissions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      {u.role ? badge(u.role.slug, "badge-indigo") : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      {u.role?.permissions.length
                        ? u.role.permissions.map((p, i) => badge(p.codename, PERM_COLORS[i % PERM_COLORS.length]))
                        : <span className="text-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 420 }}>
        <p style={{ marginBottom: ".75rem", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)" }}>
          Add user
        </p>
        <form onSubmit={handleSubmit} className="flex-col">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              required
              type="email"
              placeholder="alice@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              required
              placeholder="alice"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password (optional)</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={form.password ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={form.role_id ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, role_id: e.target.value ? Number(e.target.value) : undefined }))
              }
            >
              <option value="">No role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting} style={{ alignSelf: "flex-start" }}>
            {submitting ? "Adding…" : "Add user"}
          </button>
        </form>
      </div>
    </div>
  );
}
