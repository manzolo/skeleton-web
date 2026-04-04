import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "../src/api/client";
import Users from "../src/pages/Users";

const mockAdmin: client.User = {
  id: 1,
  email: "admin@example.com",
  username: "admin",
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  role: {
    id: 1,
    name: "Administrator",
    slug: "admin",
    permissions: [
      { id: 1, name: "Can view users", codename: "users.view" },
      { id: 2, name: "Can edit users", codename: "users.edit" },
    ],
  },
};

const mockRoles: client.Role[] = [
  { id: 1, name: "Administrator", slug: "admin", permissions: [] },
];

describe("Users", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders users with role and permissions", async () => {
    vi.spyOn(client, "fetchUsers").mockResolvedValue([mockAdmin]);
    vi.spyOn(client, "fetchRoles").mockResolvedValue(mockRoles);

    render(<Users />);

    await waitFor(() => expect(screen.getByText("admin", { selector: "td" })).toBeInTheDocument());
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("admin", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("users.view")).toBeInTheDocument();
    expect(screen.getByText("users.edit")).toBeInTheDocument();
  });

  it("renders user without role", async () => {
    vi.spyOn(client, "fetchUsers").mockResolvedValue([
      { ...mockAdmin, role: null },
    ]);
    vi.spyOn(client, "fetchRoles").mockResolvedValue([]);

    render(<Users />);

    await waitFor(() => expect(screen.getByText("admin")).toBeInTheDocument());
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("shows empty state when no users", async () => {
    vi.spyOn(client, "fetchUsers").mockResolvedValue([]);
    vi.spyOn(client, "fetchRoles").mockResolvedValue([]);

    render(<Users />);

    await waitFor(() => expect(screen.getByText("No users yet.")).toBeInTheDocument());
  });

  it("creates a user via form and appends to list", async () => {
    const newUser: client.User = {
      id: 2,
      email: "bob@test.com",
      username: "bob",
      is_active: true,
      created_at: "2024-01-02T00:00:00Z",
      role: null,
    };
    vi.spyOn(client, "fetchUsers").mockResolvedValue([]);
    vi.spyOn(client, "fetchRoles").mockResolvedValue([]);
    const createSpy = vi.spyOn(client, "createUser").mockResolvedValue(newUser);

    render(<Users />);
    await waitFor(() => expect(screen.getByText("No users yet.")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Email"), "bob@test.com");
    await userEvent.type(screen.getByLabelText("Username"), "bob");
    await userEvent.click(screen.getByRole("button", { name: "Add user" }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ email: "bob@test.com", username: "bob" })
    ));
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());
  });

  it("enters edit mode and saves updated user", async () => {
    const updated: client.User = { ...mockAdmin, username: "admin2", email: "admin2@example.com" };
    vi.spyOn(client, "fetchUsers").mockResolvedValue([mockAdmin]);
    vi.spyOn(client, "fetchRoles").mockResolvedValue(mockRoles);
    const updateSpy = vi.spyOn(client, "updateUser").mockResolvedValue(updated);

    render(<Users />);
    await waitFor(() => expect(screen.getByText("admin", { selector: "td" })).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    const usernameInput = screen.getByLabelText("Edit username");
    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, "admin2");

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(
        mockAdmin.id,
        expect.objectContaining({ username: "admin2" })
      )
    );
    await waitFor(() => expect(screen.getByText("admin2")).toBeInTheDocument());
  });

  it("cancels edit without saving", async () => {
    vi.spyOn(client, "fetchUsers").mockResolvedValue([mockAdmin]);
    vi.spyOn(client, "fetchRoles").mockResolvedValue(mockRoles);

    render(<Users />);
    await waitFor(() => expect(screen.getByText("admin", { selector: "td" })).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Edit username")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Edit username")).not.toBeInTheDocument();
    expect(screen.getByText("admin", { selector: "td" })).toBeInTheDocument();
  });

  it("deletes a user after confirmation", async () => {
    vi.spyOn(client, "fetchUsers").mockResolvedValue([mockAdmin]);
    vi.spyOn(client, "fetchRoles").mockResolvedValue(mockRoles);
    const deleteSpy = vi.spyOn(client, "deleteUser").mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<Users />);
    await waitFor(() => expect(screen.getByText("admin", { selector: "td" })).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith(mockAdmin.id));
    await waitFor(() => expect(screen.getByText("No users yet.")).toBeInTheDocument());
  });
});
