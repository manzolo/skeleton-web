# Architecture

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12 + FastAPI + SQLAlchemy 2 async + Alembic |
| Frontend | React 18 + TypeScript + Vite 5 |
| Database | PostgreSQL 16 |
| Dev runtime | Docker Compose |
| Prod runtime | Docker Compose + nginx |
| Tests | pytest + pytest-asyncio / Vitest + Testing Library |
| CI/CD | GitHub Actions |

## Container Topology

```
Browser
  └─► localhost:5173  (frontend / Vite dev server)
            │  proxy /api/* → http://backend:8000
            ▼
       backend:8000  (FastAPI + uvicorn)
            │  SQLAlchemy asyncpg
            ▼
          db:5432  (PostgreSQL 16)
```

All three containers share `skeleton_network` (bridge).  
No CORS configuration needed: the browser always talks to the same origin (`localhost:5173`).

## Data Model

```
permissions          role_permissions          roles              users
────────────         ────────────────          ─────────          ──────────────────────
id (PK)              role_id (FK)              id (PK)            id (PK)
name                 permission_id (FK)        name               email (unique)
codename (unique)                              slug (unique)      username (unique)
                                                                  password_hash (nullable)
                                                                  is_active
                                                                  created_at
                                                                  role_id (FK, nullable)
```

**Patterns demonstrated:**
1. Simple FK: `User.role_id → roles.id`
2. Many-to-many: `Role ↔ Permission` via `role_permissions` association table
3. Two-level nested response: `User → Role → [Permission]`

## API Reference

Swagger UI: `http://localhost:8000/docs`  
ReDoc: `http://localhost:8000/redoc`  
OpenAPI spec: `docs/openapi.json` (committed, update with `make openapi`)

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check with DB connectivity |
| GET | /permissions/ | List all permissions |
| POST | /permissions/ | Create permission (codename unique) |
| GET | /roles/ | List roles with permissions |
| POST | /roles/ | Create role (name+slug unique) |
| POST | /roles/{id}/permissions/{id} | Assign permission to role (idempotent) |
| GET | /users/ | List users with role and permissions |
| POST | /users/ | Create user (email+username unique, password hashed) |
| GET | /users/{id} | Get single user, 404 if not found |

## Health Chain

Docker Compose uses `depends_on.condition: service_healthy`:

```
db  ──healthy──►  backend  ──healthy──►  frontend
```

`GET /health` executes `SELECT 1` via `get_db()`. Returns:
- `{"status":"ok","database":"ok","env":"..."}` — all good
- `{"status":"degraded","database":"degraded","env":"..."}` — DB unreachable

## Async DB Session

`get_db()` is an async generator:
1. Opens a session
2. Yields it to the route handler
3. Commits on success, rolls back on exception

Route handlers receive `AsyncSession` via `Depends(get_db)` and never call commit/rollback directly.

`expire_on_commit=False` prevents lazy-load failures in async context.

## Alembic + asyncpg

- Runtime: `asyncpg` (async driver)
- Migrations: `psycopg2` (sync driver, required by Alembic)

`alembic/env.py` rewrites `postgresql+asyncpg://` → `postgresql+psycopg2://` before running migrations.

Tests use `alembic upgrade head` (not `create_all`) so migration correctness is verified on every test run.

## Seed

`backend/src/seed.py` runs automatically after migrations on every container start (idempotent):
- Creates 4 base permissions (`users.view`, `users.edit`, `users.delete`, `roles.manage`)
- Creates `Administrator` role with all permissions
- Creates `admin` user with hashed password from `ADMIN_PASSWORD` env var (default: `changeme`)

## Claude Code Hook

`.claude/settings.json` registers a `PostToolUse` hook:
- Triggers on `Write | Edit | MultiEdit`
- Checks if the modified file is under `backend/src/`
- If yes: runs `docker compose exec -T backend pytest tests/ -v --tb=short -q`

This gives immediate test feedback when editing backend source code.
