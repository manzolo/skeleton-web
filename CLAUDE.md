# skeleton-web — Claude Code Guide

## Quick Start

```bash
cp .env.example .env
make dev
```

This builds all images and starts the stack. All containers become healthy before the next one starts (`db → backend → frontend`).

## Stack

- **Backend**: `backend/src/` — FastAPI + SQLAlchemy 2 async + Alembic
- **Frontend**: `frontend/src/` — React 18 + TypeScript + Vite 5
- **DB**: PostgreSQL 16 (managed by Docker)

## Implementation Policy

**Every new feature or endpoint must include:**
1. Tests written alongside (or before) the implementation
2. Backend tests in `backend/tests/test_<feature>.py` using pytest-asyncio + httpx
3. Frontend tests in `frontend/tests/<Component>.test.tsx` using Vitest + Testing Library
4. Updated `docs/architecture.md` if the public API or data model changes
5. A docstring on new FastAPI route handlers; JSDoc on exported TypeScript functions

Use `/implement <description>` to follow the full TDD workflow automatically.

## Skills (Slash Commands)

| Command | Description |
|---|---|
| `/implement <feature>` | TDD workflow: tests → implementation → docs |
| `/bump patch\|minor\|major\|1.2.3` | Commit + tag + push + GitHub Release (CI builds Docker images) |

## Common Commands

```bash
make dev          # build + start + follow logs
make test         # run backend pytest + frontend vitest
make down         # stop all containers
make migrate      # alembic upgrade head
make migrate-new  # create a new migration (prompts for name)
make health       # curl /health and pretty-print JSON
make db-shell     # psql into the database
make shell-backend  # bash into the backend container
make clean        # down -v + docker system prune
make demo         # apply Products demo feature on a fresh clone
make demo-clean   # undo Products demo and restore original state
```

## Products Demo

`demos/products/` contains a self-contained example of a new entity (`Product`) that demonstrates the full development workflow: Alembic migration, FastAPI CRUD endpoints, React page with form.

**Files involved:**
- `demos/products/backend_model.py` — `Product` SQLAlchemy model (appended to `models.py`)
- `demos/products/routers/products.py` — FastAPI router with Pydantic schemas
- `demos/products/tests/test_products.py` — pytest-asyncio integration tests
- `demos/products/frontend/Products.tsx` — React page
- `demos/products/frontend/Products.test.tsx` — Vitest tests
- `demos/products/frontend/api_client.ts` — API client additions (appended to `client.ts`)
- `scripts/demo-products.sh` — idempotent script that applies all changes + runs migrations + tests
- `scripts/demo-products-clean.sh` — reverses all changes
- `.github/workflows/demo.yml` — CI that applies demo and smoke-tests the API
- `docs/demo-products.md` — step-by-step tutorial

**When adding new template features, verify the demo still works:**
- If you change `backend/src/models.py`, ensure `demos/products/backend_model.py` still appends cleanly (it inherits `Base`, `Mapped`, `mapped_column`, `String`, `DateTime` from the models already imported)
- If you change `backend/src/main.py` router imports or `app.include_router` calls, update `scripts/demo-products.sh` and `scripts/demo-products-clean.sh` — the scripts patch those exact lines
- If you change `frontend/src/App.tsx` or `frontend/src/components/Navbar.tsx` structure, update the corresponding Python string replacement in `scripts/demo-products.sh`
- After any structural change to the above files, run `make demo && make demo-clean` to confirm idempotency

## Template Quality Rules

This is a **starting point for new projects** — every choice propagates to all future projects built from it.

- **No suppressed warnings** — if a library emits warnings, replace it with a maintained alternative
- **No obsolete dependencies** — verify a package is actively maintained before adding it
- **`docker-compose.override.yml`** is for local dev bind-mounts (auto-loaded); CI uses `docker compose -f docker-compose.yml` to skip it
- **After changing `requirements.txt` or `package.json`**, always run `docker compose up --build -d` — bind-mounts don't cover installed packages
- **Alembic migrations belong in git** — never add `backend/alembic/versions/*.py` to `.gitignore`

## Backend Development

Source files are bind-mounted via `docker-compose.override.yml`: `./backend/src → /app/src`  
Edit files locally; uvicorn reloads automatically.

Editing any file under `backend/src/` triggers automatic pytest via the `.claude/settings.json` hook.

### Adding a new endpoint

1. Use `/implement <description>` — tests are created first
2. Add models in `backend/src/models.py` if needed
3. Run `make migrate-new` to generate a migration
4. Run `make migrate` to apply

## Frontend Development

Source files are bind-mounted via `docker-compose.override.yml`: `./frontend/src → /app/src`  
Vite HMR reloads the browser automatically.

All backend calls go through `/api/*` — Vite proxies them to `http://backend:8000`.

## Tests

```bash
make test-backend   # pytest inside the backend container
make test-frontend  # vitest --run inside the frontend container
```

## Releases

```
/bump patch    # 0.1.0 → 0.1.1
/bump minor    # 0.1.0 → 0.2.0
/bump major    # 0.1.0 → 1.0.0
/bump 2.0.0    # explicit version
```

The bump workflow: commits pending changes → creates git tag → pushes to GitHub → creates GitHub Release.  
CI then builds and pushes Docker images to GHCR (`ghcr.io/manzolo/<repo>`) and Docker Hub (`manzolo/<repo>`):
- `manzolo/<repo>-backend:latest` and `manzolo/<repo>-backend:v1.2.3`
- `manzolo/<repo>-frontend:latest` and `manzolo/<repo>-frontend:v1.2.3`

**Required repository secrets**: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`

## Server Deploy

### First deploy (before first release — build on the server)

```bash
# On the server
git clone <repo-url> /srv/myapp && cd /srv/myapp
cp .env.example .env && $EDITOR .env   # set strong passwords + SECRET_KEY
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### After first release (no source code needed on the server)

```bash
# On the server — only docker-compose.server.yml + .env needed
mkdir /srv/myapp && cd /srv/myapp
# copy docker-compose.server.yml and .env
docker compose -f docker-compose.server.yml pull
docker compose -f docker-compose.server.yml up -d
```

**Container names** (predictable for reverse-proxy config):
- `<project>-db`, `<project>-backend`, `<project>-frontend`

**Nginx Proxy Manager / Traefik / Caddy**: point to `<project>-frontend:80`.  
The frontend exposes no host ports in `docker-compose.prod.yml` — join the proxy's Docker network
or add `ports: ["127.0.0.1:8080:80"]` if you prefer a localhost-only host port.

### Private seed data

To pre-load data that must not be committed (personal info, pricing, etc.):

```python
# backend/private_seed.py  — listed in .gitignore, copy to server manually
from sqlalchemy.ext.asyncio import AsyncSession
from src.models import SomeModel

async def seed(db: AsyncSession) -> None:
    db.add(SomeModel(name="Private record"))
```

Copy this file to the server alongside the compose file. It runs automatically after the standard seed.

## OpenAPI

Swagger UI: `http://localhost:8000/docs`  
ReDoc: `http://localhost:8000/redoc`

Update the committed spec after API changes:
```bash
make openapi
git add docs/openapi.json
```

## Architecture

See `docs/architecture.md` for the full design decisions.
