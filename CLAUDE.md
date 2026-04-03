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
```

## Backend Development

Source files are bind-mounted: `./backend/src → /app/src`  
Edit files locally; uvicorn reloads automatically.

Editing any file under `backend/src/` triggers automatic pytest via the `.claude/settings.json` hook.

### Adding a new endpoint

1. Use `/implement <description>` — tests are created first
2. Add models in `backend/src/models.py` if needed
3. Run `make migrate-new` to generate a migration
4. Run `make migrate` to apply

## Frontend Development

Source files are bind-mounted: `./frontend/src → /app/src`  
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
CI then builds and pushes Docker images to GHCR (`ghcr.io/manzolo/<repo>`) and Docker Hub (`manzolo/<repo>`).

**Required repository secrets**: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`

## Architecture

See `docs/architecture.md` for the full design decisions.
