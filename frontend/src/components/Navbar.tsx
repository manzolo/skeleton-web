import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav style={{ display: "flex", gap: "1rem", padding: "0.75rem 1.5rem", borderBottom: "1px solid #ddd", fontFamily: "monospace" }}>
      <Link to="/">Home</Link>
      <Link to="/users">Users</Link>
      <span style={{ marginLeft: "auto" }}>
        {token ? (
          <button onClick={handleLogout} style={{ cursor: "pointer", background: "none", border: "none", fontFamily: "monospace", fontSize: "1rem" }}>
            Logout
          </button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </span>
    </nav>
  );
}
