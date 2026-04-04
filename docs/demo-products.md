# Demo: Adding a Products feature

This walkthrough shows the full skeleton-web development cycle on a concrete example:
a `Product` entity with a database table, REST API, and React UI.

Two paths are available:

- **Option A — Manual (TDD workflow)**: follow the steps below to understand each layer
- **Option B — Automatic**: run `make demo` and everything is applied for you

---

## Prerequisites

- Docker and Docker Compose installed
- A fresh clone of skeleton-web (the template must not already have `products` applied)

---

## Setup

```bash
cp .env.example .env
make dev          # builds all images and starts the stack
make health       # wait until {"status":"ok"}
```

---

## Option A — Manual (TDD workflow)

### 1. Implement with `/implement`

Open Claude Code in this directory and run:

```
/implement products CRUD: table products with fields name (string, not null), description (text, nullable), price (numeric 10,2, not null), stock (integer, default 0); full REST API (GET /products/, POST /products/, GET /products/{id}); frontend page with product list and create form
```

The `/implement` skill follows TDD order:

1. Backend tests → `backend/tests/test_products.py`
2. Model → adds `Product` class to `backend/src/models.py`
3. Schemas → adds `ProductCreate` / `ProductRead` to the router
4. Router → `backend/src/routers/products.py`
5. Register router → `backend/src/main.py`
6. Migration → `make migrate-new` then `make migrate`
7. Frontend tests → `frontend/tests/Products.test.tsx`
8. API client → appends to `frontend/src/api/client.ts`
9. Page → `frontend/src/pages/Products.tsx`
10. Routing + navbar → `frontend/src/App.tsx` + `frontend/src/components/Navbar.tsx`
11. `make test` — all tests green

### 2. Update the OpenAPI spec

```bash
make openapi
git add docs/openapi.json
git commit -m "docs: update openapi spec with products endpoint"
```

### 3. Release

```
/bump patch
```

---

## Option B — Automatic

```bash
make demo
```

The script (`scripts/demo-products.sh`) applies all the above changes automatically and
runs the full test suite. It is **idempotent** — safe to run more than once.

To restore the template to its original state:

```bash
make demo-clean
```

---

## Verification

After either option, verify the feature works end-to-end:

```bash
# List products (empty)
curl -s http://localhost:8000/products/ | python3 -m json.tool

# Create a product
curl -s -X POST http://localhost:8000/products/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget","description":"A useful widget","price":"9.99","stock":100}' \
  | python3 -m json.tool

# List products (1 item)
curl -s http://localhost:8000/products/ | python3 -m json.tool

# Get by id
curl -s http://localhost:8000/products/1 | python3 -m json.tool
```

Open the browser:

- **Swagger UI**: http://localhost:8000/docs — Products endpoints appear under the `products` tag
- **App**: http://localhost:5173 — "Products" link in the navbar, table + create form

---

## What was added

| Layer | File |
|-------|------|
| Model | `backend/src/models.py` — `Product` class |
| Schemas | inline in `backend/src/routers/products.py` |
| Router | `backend/src/routers/products.py` |
| Backend tests | `backend/tests/test_products.py` |
| Frontend page | `frontend/src/pages/Products.tsx` |
| Frontend tests | `frontend/tests/Products.test.tsx` |
| API client | `frontend/src/api/client.ts` — `fetchProducts`, `createProduct` |
| Routing | `frontend/src/App.tsx` — `/products` route |
| Navbar | `frontend/src/components/Navbar.tsx` — Products link |
| Migration | `backend/alembic/versions/*_add_products_table.py` |

---

## Next steps

- Add `PUT /products/{id}` and `DELETE /products/{id}` for full CRUD
- Add authentication guard — only logged-in users can create products
- Relate products to a category (new table, FK)
- Export the updated OpenAPI spec: `make openapi`
