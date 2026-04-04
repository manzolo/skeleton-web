import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "../src/api/client";
import Products from "../src/pages/Products";

const mockProduct: client.Product = {
  id: 1,
  name: "Widget",
  description: "A useful widget",
  price: 9.99,
  stock: 100,
  created_at: "2024-01-01T00:00:00Z",
};

describe("Products", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders products list", async () => {
    vi.spyOn(client, "fetchProducts").mockResolvedValue([mockProduct]);

    render(<Products />);

    await waitFor(() => expect(screen.getByText("Widget")).toBeInTheDocument());
    expect(screen.getByText("A useful widget")).toBeInTheDocument();
    expect(screen.getByText("€9.99")).toBeInTheDocument();
    expect(screen.getByText("100 in stock")).toBeInTheDocument();
  });

  it("shows empty state when no products", async () => {
    vi.spyOn(client, "fetchProducts").mockResolvedValue([]);

    render(<Products />);

    await waitFor(() => expect(screen.getByText("No products yet. Add one below.")).toBeInTheDocument());
  });

  it("creates a product via form and appends to list", async () => {
    const newProduct: client.Product = {
      id: 2,
      name: "Gadget",
      description: null,
      price: 19.99,
      stock: 0,
      created_at: "2024-01-02T00:00:00Z",
    };
    vi.spyOn(client, "fetchProducts").mockResolvedValue([]);
    const createSpy = vi.spyOn(client, "createProduct").mockResolvedValue(newProduct);

    render(<Products />);
    await waitFor(() => expect(screen.getByText("No products yet. Add one below.")).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText("Name"), "Gadget");
    await userEvent.clear(screen.getByLabelText("Price (€)"));
    await userEvent.type(screen.getByLabelText("Price (€)"), "19.99");
    await userEvent.click(screen.getByRole("button", { name: "Add product" }));

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Gadget" })
      )
    );
    await waitFor(() => expect(screen.getByText("Gadget")).toBeInTheDocument());
  });

  it("enters edit mode and saves updated product", async () => {
    const updated: client.Product = { ...mockProduct, name: "Updated Widget", stock: 50 };
    vi.spyOn(client, "fetchProducts").mockResolvedValue([mockProduct]);
    const updateSpy = vi.spyOn(client, "updateProduct").mockResolvedValue(updated);

    render(<Products />);
    await waitFor(() => expect(screen.getByText("Widget")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    const nameInput = screen.getByLabelText("Edit name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Widget");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(
        mockProduct.id,
        expect.objectContaining({ name: "Updated Widget" })
      )
    );
    await waitFor(() => expect(screen.getByText("Updated Widget")).toBeInTheDocument());
  });

  it("cancels edit without saving", async () => {
    vi.spyOn(client, "fetchProducts").mockResolvedValue([mockProduct]);

    render(<Products />);
    await waitFor(() => expect(screen.getByText("Widget")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Edit name")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Edit name")).not.toBeInTheDocument();
    expect(screen.getByText("Widget")).toBeInTheDocument();
  });

  it("deletes a product after confirmation", async () => {
    vi.spyOn(client, "fetchProducts").mockResolvedValue([mockProduct]);
    const deleteSpy = vi.spyOn(client, "deleteProduct").mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<Products />);
    await waitFor(() => expect(screen.getByText("Widget")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith(mockProduct.id));
    await waitFor(() => expect(screen.queryByText("Widget")).not.toBeInTheDocument());
    expect(screen.getByText("No products yet. Add one below.")).toBeInTheDocument();
  });
});
