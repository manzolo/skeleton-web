import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as client from "../src/api/client";
import { AuthProvider } from "../src/context/AuthContext";
import Navbar from "../src/components/Navbar";
import Home from "../src/pages/Home";
import Login from "../src/pages/Login";
import Users from "../src/pages/Users";

function renderWithRouter(path: string, element: React.ReactElement) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>
    </AuthProvider>
  );
}

describe("Routing", () => {
  it("/ renders Home", () => {
    renderWithRouter("/", <Home />);
    expect(screen.getByRole("heading", { name: /skeleton-web/i })).toBeInTheDocument();
  });

  it("/users renders Users", async () => {
    vi.spyOn(client, "fetchUsers").mockResolvedValue([]);
    vi.spyOn(client, "fetchRoles").mockResolvedValue([]);
    renderWithRouter("/users", <Users />);
    expect(await screen.findByRole("heading", { name: /users/i })).toBeInTheDocument();
  });

  it("/login renders Login", () => {
    renderWithRouter("/login", <Login />);
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });
});

describe("Navbar", () => {
  beforeEach(() => localStorage.clear());

  it("shows Login link when not authenticated", () => {
    render(
      <AuthProvider>
        <MemoryRouter><Navbar /></MemoryRouter>
      </AuthProvider>
    );
    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
  });

  it("shows Logout button when authenticated", () => {
    localStorage.setItem("token", "fake-token");
    render(
      <AuthProvider>
        <MemoryRouter><Navbar /></MemoryRouter>
      </AuthProvider>
    );
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument();
  });
});
