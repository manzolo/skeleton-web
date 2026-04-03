import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Home from "../src/pages/Home";
import * as client from "../src/api/client";

describe("Home", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows Online badge when health is ok", async () => {
    vi.spyOn(client, "fetchHealth").mockResolvedValue({
      status: "ok",
      database: "ok",
      env: "test",
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Online")).toBeInTheDocument();
    });
  });

  it("shows Degraded badge when health is degraded", async () => {
    vi.spyOn(client, "fetchHealth").mockResolvedValue({
      status: "degraded",
      database: "degraded",
      env: "test",
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Degraded")).toBeInTheDocument();
    });
  });

  it("shows Offline badge on fetch error", async () => {
    vi.spyOn(client, "fetchHealth").mockRejectedValue(new Error("Network error"));

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Offline")).toBeInTheDocument();
    });
  });
});
