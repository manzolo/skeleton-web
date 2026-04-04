import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "../src/api/client";
import { AuthProvider } from "../src/context/AuthContext";
import Login from "../src/pages/Login";

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Login />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("Login", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("renders login form", () => {
    renderLogin();
    expect(screen.getByLabelText("Username or email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("successful login stores token in localStorage", async () => {
    vi.spyOn(client, "login").mockResolvedValue({ access_token: "tok123", token_type: "bearer" });
    renderLogin();

    await userEvent.type(screen.getByLabelText("Username or email"), "admin");
    await userEvent.type(screen.getByLabelText("Password"), "changeme");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(localStorage.getItem("token")).toBe("tok123"));
  });

  it("failed login shows error message", async () => {
    vi.spyOn(client, "login").mockRejectedValue(new Error("HTTP 401"));
    renderLogin();

    await userEvent.type(screen.getByLabelText("Username or email"), "bad");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(screen.getByText("Invalid username or password")).toBeInTheDocument());
  });

  it("disables button while submitting", async () => {
    vi.spyOn(client, "login").mockImplementation(() => new Promise(() => {})); // never resolves
    renderLogin();

    await userEvent.type(screen.getByLabelText("Username or email"), "admin");
    await userEvent.type(screen.getByLabelText("Password"), "pass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  });
});
