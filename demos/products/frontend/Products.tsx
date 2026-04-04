import { useEffect, useReducer, useState } from "react";
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
  type Product,
  type ProductCreate,
} from "../api/client";

type State =
  | { status: "loading" }
  | { status: "ok"; products: Product[] }
  | { status: "error"; message: string };

type Action =
  | { type: "loaded"; products: Product[] }
  | { type: "error"; message: string }
  | { type: "add"; product: Product }
  | { type: "update"; product: Product }
  | { type: "remove"; id: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loaded":
      return { status: "ok", products: action.products };
    case "error":
      return { status: "error", message: action.message };
    case "add":
      if (state.status !== "ok") return state;
      return { ...state, products: [...state.products, action.product] };
    case "update":
      if (state.status !== "ok") return state;
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.product.id ? action.product : p
        ),
      };
    case "remove":
      if (state.status !== "ok") return state;
      return { ...state, products: state.products.filter((p) => p.id !== action.id) };
  }
}

const EMPTY_FORM: ProductCreate = { name: "", price: 0, stock: 0 };

export default function Products() {
  const [state, dispatch] = useReducer(reducer, { status: "loading" });
  const [form, setForm] = useState<ProductCreate>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ProductCreate>(EMPTY_FORM);

  useEffect(() => {
    fetchProducts()
      .then((products) => dispatch({ type: "loaded", products }))
      .catch((e: Error) => dispatch({ type: "error", message: e.message }));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const product = await createProduct(form);
      dispatch({ type: "add", product });
      setForm(EMPTY_FORM);
    } catch {
      alert("Failed to create product.");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      description: product.description ?? undefined,
      price: Number(product.price),
      stock: product.stock,
    });
  }

  async function handleUpdate(id: number) {
    try {
      const updated = await updateProduct(id, editForm);
      dispatch({ type: "update", product: updated });
      setEditingId(null);
    } catch {
      alert("Failed to update product.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      dispatch({ type: "remove", id });
    } catch {
      alert("Failed to delete product.");
    }
  }

  if (state.status === "loading") return <p className="text-muted" style={{ padding: "2rem 1.5rem" }}>Loading products…</p>;
  if (state.status === "error") return <p className="error-msg" style={{ padding: "2rem 1.5rem" }}>Error: {state.message}</p>;

  const { products } = state;

  return (
    <div className="page">
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Products</h1>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        {products.length === 0 ? (
          <p className="text-muted">No products yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) =>
                  editingId === p.id ? (
                    <tr key={p.id}>
                      <td>
                        <input
                          aria-label="Edit name"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          style={{ width: "100%" }}
                        />
                      </td>
                      <td>
                        <input
                          aria-label="Edit description"
                          value={editForm.description ?? ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value || undefined }))}
                          style={{ width: "100%" }}
                        />
                      </td>
                      <td>
                        <input
                          aria-label="Edit price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={editForm.price}
                          onChange={(e) => setEditForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <input
                          aria-label="Edit stock"
                          type="number"
                          min="0"
                          value={editForm.stock ?? 0}
                          onChange={(e) => setEditForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                          style={{ width: 60 }}
                        />
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(p.id)}>Save</button>
                        {" "}
                        <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.description ?? <span className="text-muted">—</span>}</td>
                      <td>€{Number(p.price).toFixed(2)}</td>
                      <td>{p.stock}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn btn-sm" onClick={() => startEdit(p)}>Edit</button>
                        {" "}
                        <button className="btn btn-sm" style={{ color: "var(--danger)" }} onClick={() => handleDelete(p.id)}>Delete</button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 420 }}>
        <p style={{ marginBottom: ".75rem", fontSize: "13px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted)" }}>
          Add product
        </p>
        <form onSubmit={handleCreate} className="flex-col">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              required
              placeholder="Widget"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              placeholder="Optional description"
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || undefined }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="price">Price</label>
            <input
              id="price"
              required
              type="number"
              step="0.01"
              min="0"
              placeholder="9.99"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="stock">Stock</label>
            <input
              id="stock"
              type="number"
              min="0"
              placeholder="0"
              value={form.stock ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={submitting} style={{ alignSelf: "flex-start" }}>
            {submitting ? "Adding…" : "Add product"}
          </button>
        </form>
      </div>
    </div>
  );
}
