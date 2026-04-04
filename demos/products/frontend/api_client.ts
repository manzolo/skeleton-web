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
