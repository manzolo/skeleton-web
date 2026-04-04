#!/usr/bin/env bash
# scripts/demo-products-clean.sh — undo the Products demo feature.
# Idempotent: safe to run multiple times.
# Usage: bash scripts/demo-products-clean.sh   (or: make demo-clean)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── 1. Rollback migration ─────────────────────────────────────────────────────
echo "==> Rolling back Alembic migration..."
docker compose exec -T backend alembic downgrade -1 2>/dev/null && echo "  rolled back" || echo "  nothing to roll back"

# ── 2. Remove generated migration file ───────────────────────────────────────
echo "==> Removing products migration file from alembic/versions/..."
python3 - "$ROOT" <<'PY'
import sys, pathlib
versions = pathlib.Path(sys.argv[1]) / "backend/alembic/versions"
for f in sorted(versions.glob("*.py")):
    if "add_products_table" in f.read_text():
        f.unlink()
        print(f"  removed {f.name}")
        break
else:
    print("  not found, skipped")
PY

# ── 3. Remove router ──────────────────────────────────────────────────────────
echo "==> Removing backend/src/routers/products.py..."
rm -f "$ROOT/backend/src/routers/products.py"
echo "  done"

# ── 4. Revert main.py ────────────────────────────────────────────────────────
echo "==> Reverting backend/src/main.py..."
python3 - "$ROOT" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "backend/src/main.py"
c = p.read_text()
if "products" in c:
    c = c.replace(
        "from .routers import auth, permissions, products, roles, users",
        "from .routers import auth, permissions, roles, users",
    )
    c = c.replace(
        '\napp.include_router(products.router, prefix="/products", tags=["products"])',
        "",
    )
    p.write_text(c)
    print("  reverted")
else:
    print("  already clean, skipped")
PY

# ── 5. Remove Product model from models.py ───────────────────────────────────
echo "==> Removing Product model from backend/src/models.py..."
python3 - "$ROOT" <<'PY'
import sys, re, pathlib
p = pathlib.Path(sys.argv[1]) / "backend/src/models.py"
c = p.read_text()
if "# --- Product ---" in c:
    c = re.sub(r"\n\n# --- Product ---.*", "", c, flags=re.DOTALL)
    p.write_text(c)
    print("  removed")
else:
    print("  not found, skipped")
PY

# ── 6. Remove backend tests ───────────────────────────────────────────────────
echo "==> Removing backend/tests/test_products.py..."
rm -f "$ROOT/backend/tests/test_products.py"
echo "  done"

# ── 7. Remove Products from frontend/src/api/client.ts ───────────────────────
echo "==> Removing Products section from frontend/src/api/client.ts..."
python3 - "$ROOT" <<'PY'
import sys, re, pathlib
p = pathlib.Path(sys.argv[1]) / "frontend/src/api/client.ts"
c = p.read_text()
if "// --- Products ---" in c:
    c = re.sub(r"\n\n// --- Products ---.*", "", c, flags=re.DOTALL)
    p.write_text(c)
    print("  removed")
else:
    print("  not found, skipped")
PY

# ── 8. Remove frontend page and tests ────────────────────────────────────────
echo "==> Removing frontend/src/pages/Products.tsx..."
rm -f "$ROOT/frontend/src/pages/Products.tsx"
echo "  done"

echo "==> Removing frontend/tests/Products.test.tsx..."
rm -f "$ROOT/frontend/tests/Products.test.tsx"
echo "  done"

# ── 9. Revert App.tsx ────────────────────────────────────────────────────────
echo "==> Reverting frontend/src/App.tsx..."
python3 - "$ROOT" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "frontend/src/App.tsx"
c = p.read_text()
if "/products" in c:
    c = c.replace(
        'import Products from "./pages/Products";\nimport Users from "./pages/Users";',
        'import Users from "./pages/Users";',
    )
    c = c.replace(
        '<Route path="/products" element={<Products />} />\n            <Route path="/login" element={<Login />} />',
        '<Route path="/login" element={<Login />} />',
    )
    p.write_text(c)
    print("  reverted")
else:
    print("  already clean, skipped")
PY

# ── 10. Revert Navbar.tsx ─────────────────────────────────────────────────────
echo "==> Reverting frontend/src/components/Navbar.tsx..."
python3 - "$ROOT" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / "frontend/src/components/Navbar.tsx"
c = p.read_text()
if '"/products"' in c:
    c = c.replace(
        '<Link to="/users">Users</Link>\n      <Link to="/products">Products</Link>',
        '<Link to="/users">Users</Link>',
    )
    p.write_text(c)
    print("  reverted")
else:
    print("  already clean, skipped")
PY

echo ""
echo "Demo cleaned. Template is back to its original state."
