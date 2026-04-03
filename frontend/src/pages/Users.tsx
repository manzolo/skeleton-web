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

const badge = (text: string, color: string) => (
  <span
    key={text}
    style={{
      background: color,
      color: "#fff",
      padding: "1px 7px",
      borderRadius: 3,
      fontSize: "0.75rem",
      marginRight: 4,
    }}
  >
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

  if (state.status === "loading") return <p>Loading users…</p>;
  if (state.status === "error") return <p style={{ color: "#ef4444" }}>Error: {state.message}</p>;

  const { users, roles } = state;

  return (
    <div style={{ fontFamily: "monospace", marginTop: "2rem", maxWidth: 700 }}>
      <h2>Users</h2>

      {users.length === 0 ? (
        <p style={{ color: "#888" }}>No users yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
              <th style={{ padding: "4px 8px" }}>Username</th>
              <th style={{ padding: "4px 8px" }}>Email</th>
              <th style={{ padding: "4px 8px" }}>Role</th>
              <th style={{ padding: "4px 8px" }}>Permissions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "4px 8px" }}>{u.username}</td>
                <td style={{ padding: "4px 8px" }}>{u.email}</td>
                <td style={{ padding: "4px 8px" }}>
                  {u.role ? badge(u.role.slug, "#6366f1") : <span style={{ color: "#aaa" }}>—</span>}
                </td>
                <td style={{ padding: "4px 8px" }}>
                  {u.role?.permissions.length
                    ? u.role.permissions.map((p) => badge(p.codename, "#0ea5e9"))
                    : <span style={{ color: "#aaa" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Add user</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }}>
        <input
          required
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          style={{ padding: "4px 8px" }}
        />
        <input
          required
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          style={{ padding: "4px 8px" }}
        />
        <input
          placeholder="Password (optional)"
          type="password"
          value={form.password ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          style={{ padding: "4px 8px" }}
        />
        <select
          value={form.role_id ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, role_id: e.target.value ? Number(e.target.value) : undefined }))
          }
          style={{ padding: "4px 8px" }}
        >
          <option value="">No role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={submitting} style={{ padding: "6px" }}>
          {submitting ? "Adding…" : "Add user"}
        </button>
      </form>
    </div>
  );
}
