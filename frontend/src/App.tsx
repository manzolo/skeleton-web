import Home from "./pages/Home";
import Users from "./pages/Users";

export default function App() {
  return (
    <div style={{ fontFamily: "monospace", padding: "2rem", maxWidth: 700 }}>
      <Home />
      <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid #ddd" }} />
      <Users />
    </div>
  );
}
