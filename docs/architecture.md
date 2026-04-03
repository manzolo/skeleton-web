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

## Claude Code Hook

`.claude/settings.json` registers a `PostToolUse` hook:
- Triggers on `Write | Edit | MultiEdit`
- Checks if the modified file is under `backend/src/`
- If yes: runs `docker compose exec -T backend pytest tests/ -v --tb=short -q`

This gives immediate test feedback when editing backend source code.
