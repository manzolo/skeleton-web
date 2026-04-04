// --- Products ---

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  created_at: string;
}

export interface ProductCreate {
  name: string;
  description?: string;
  price: number;
  stock?: number;
}

export function fetchProducts(): Promise<Product[]> {
  return apiFetch("/products/");
}

export function createProduct(payload: ProductCreate): Promise<Product> {
  return apiFetch("/products/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id: number, payload: ProductCreate): Promise<Product> {
  return apiFetch(`/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id: number): Promise<void> {
  return apiFetch(`/products/${id}`, { method: "DELETE" });
}
