import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Users from "./pages/Users";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <div style={{ fontFamily: "monospace", padding: "2rem", maxWidth: 700 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/users" element={<Users />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
