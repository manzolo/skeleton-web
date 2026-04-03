# skeleton-web

GitHub Template Repository for full-stack web projects.

**Stack**: FastAPI + SQLAlchemy async + Alembic / React 18 + Vite / PostgreSQL 16 / Docker Compose

---

## Use this template

### 1. Create a new repository from this template

Click **"Use this template"** on GitHub, or via CLI:

```bash
gh repo create my-project --template manzolo/skeleton-web --private --clone
cd my-project
```

### 2. Configure secrets

In your new repository settings → **Secrets and variables → Actions**, add:

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (read/write) |

### 3. Start developing

```bash
cp .env.example .env
# Edit .env if needed (DB password, secret key, etc.)
make dev
```

All containers start in order: `db → backend → frontend`.  
Open `http://localhost:5173` — you should see a green "Online" badge.

### 4. Rename the project

Search and replace `skeleton-web` / `skeletondb` / `skeleton` with your project name:

```bash
# Example
grep -r "skeleton" --include="*.yml" --include="*.env*" --include="*.py" --include="*.json" -l
```

---

## What's included

```
.
├── backend/          FastAPI app (SQLAlchemy async, Alembic migrations)
├── frontend/         React 18 + Vite + TypeScript
├── .claude/
│   ├── settings.json Hook: auto-pytest on backend/src/ changes
│   └── commands/
│       ├── implement.md  /implement — TDD feature workflow
│       └── bump.md       /bump — version + release workflow
├── .github/workflows/
│   ├── ci.yml        Container build + healthcheck on every push
│   ├── test.yml      pytest + vitest on PR → main
│   └── release.yml   Build + push images to GHCR & Docker Hub on tag v*
├── docker-compose.yml
├── docker-compose.prod.yml
├── Makefile
└── docs/architecture.md
```

## Development commands

```bash
make dev          # build + start + follow logs
make test         # pytest + vitest
make down         # stop all containers
make migrate      # alembic upgrade head
make migrate-new  # create a new migration
make health       # curl /health
make clean        # down -v + docker prune
```

## Claude Code skills

| Skill | Usage | Description |
|---|---|---|
| `/implement` | `/implement <feature description>` | TDD: tests → implementation → docs |
| `/bump` | `/bump patch\|minor\|major\|1.2.3` | Commit + tag + push + Docker Hub + GitHub Release |

## CI/CD

- **Every push**: builds the Docker stack and verifies all healthchecks pass
- **PR → main**: runs pytest + vitest
- **Tag `v*`**: builds and pushes images to GHCR (`ghcr.io/manzolo/<repo>`) and Docker Hub (`manzolo/<repo>`)

## Production deploy

```bash
cp .env.example .env
# Set strong POSTGRES_PASSWORD and SECRET_KEY
docker compose -f docker-compose.prod.yml up -d
```

Frontend served by nginx on port 80, proxying `/api/*` to backend.

---

## Architecture

See [docs/architecture.md](docs/architecture.md).
