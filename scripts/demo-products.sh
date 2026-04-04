#!/usr/bin/env bash
# scripts/demo-products.sh — apply the Products demo feature to a skeleton-web clone.
# Idempotent: safe to run multiple times.
# Usage: bash scripts/demo-products.sh   (or: make demo)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMOS="$ROOT/demos/products"

# ── 0. Ensure stack is up and healthy ─────────────────────────────────────────
echo "==> Ensuring stack is up and healthy..."
docker compose up -d --wait

# ── 1. Backend model ──────────────────────────────────────────────────────────
echo "==> Appending Product model to backend/src/models.py..."
python3 - "$ROOT" "$DEMOS" <<'PY'
import sys, pathlib
root, demos = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
target = root / "backend/src/models.py"
content = target.read_text()
if "# --- Product ---" not in content:
    snippet = (demos / "backend_model.py").read_text()
    target.write_text(content.rstrip("\n") + "\n\n" + snippet)
    print("  appended")
else:
    print("  already present, skipped")
PY

# ── 2. Router ─────────────────────────────────────────────────────────────────
echo "==> Copying router to backend/src/routers/products.py..."
cp "$DEMOS/routers/products.py" "$ROOT/backend/src/routers/products.py"

# ── 3. Patch main.py ──────────────────────────────────────────────────────────
echo "==> Patching backend/src/main.py..."
python3 - "$ROOT" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "backend/src/main.py"
c = p.read_text()
if "products" not in c:
    c = c.replace(
        "from .routers import auth, permissions, roles, users",
        "from .routers import auth, permissions, products, roles, users",
    )
    c = c.replace(
        'app.include_router(users.router, prefix="/users", tags=["users"])',
        'app.include_router(users.router, prefix="/users", tags=["users"])\napp.include_router(products.router, prefix="/products", tags=["products"])',
    )
    p.write_text(c)
    print("  patched")
else:
    print("  already present, skipped")
PY

# ── 4. Backend tests ──────────────────────────────────────────────────────────
echo "==> Copying backend tests..."
cp "$DEMOS/tests/test_products.py" "$ROOT/backend/tests/test_products.py"

# ── 5. Frontend API client ────────────────────────────────────────────────────
echo "==> Appending Products API client to frontend/src/api/client.ts..."
python3 - "$ROOT" "$DEMOS" <<'PY'
import sys, pathlib
root, demos = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
target = root / "frontend/src/api/client.ts"
content = target.read_text()
if "// --- Products ---" not in content:
    snippet = (demos / "frontend/api_client.ts").read_text()
    target.write_text(content.rstrip("\n") + "\n\n" + snippet)
    print("  appended")
else:
    print("  already present, skipped")
PY

# ── 6. Frontend page ──────────────────────────────────────────────────────────
echo "==> Copying frontend page to frontend/src/pages/Products.tsx..."
cp "$DEMOS/frontend/Products.tsx" "$ROOT/frontend/src/pages/Products.tsx"

# ── 7. Frontend tests ─────────────────────────────────────────────────────────
echo "==> Copying frontend tests to frontend/tests/Products.test.tsx..."
cp "$DEMOS/frontend/Products.test.tsx" "$ROOT/frontend/tests/Products.test.tsx"

# ── 8. Patch App.tsx ──────────────────────────────────────────────────────────
echo "==> Patching frontend/src/App.tsx..."
python3 - "$ROOT" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "frontend/src/App.tsx"
c = p.read_text()
if "/products" not in c:
    c = c.replace(
        'import Users from "./pages/Users";',
        'import Products from "./pages/Products";\nimport Users from "./pages/Users";',
    )
    c = c.replace(
        '<Route path="/login" element={<Login />} />',
        '<Route path="/products" element={<Products />} />\n            <Route path="/login" element={<Login />} />',
    )
    p.write_text(c)
    print("  patched")
else:
    print("  already present, skipped")
PY

# ── 9. Patch Navbar.tsx ───────────────────────────────────────────────────────
echo "==> Patching frontend/src/components/Navbar.tsx..."
python3 - "$ROOT" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "frontend/src/components/Navbar.tsx"
c = p.read_text()
if '"/products"' not in c:
    c = c.replace(
        '<Link to="/users">Users</Link>',
        '<Link to="/users">Users</Link>\n      <Link to="/products">Products</Link>',
    )
    p.write_text(c)
    print("  patched")
else:
    print("  already present, skipped")
PY

# ── 10. Migration ─────────────────────────────────────────────────────────────
echo "==> Generating and applying Alembic migration..."
docker compose exec -T backend alembic revision --autogenerate -m "add_products_table"
docker compose exec -T backend alembic upgrade head

# ── 11. Tests ─────────────────────────────────────────────────────────────────
echo "==> Running full test suite..."
make -C "$ROOT" test

echo ""
echo "Done! Products demo is live."
echo "  API:     http://localhost:8000/products/"
echo "  Swagger: http://localhost:8000/docs"
echo "  App:     http://localhost:5173  (Products tab in navbar)"
