# Production Deployment Guide

This guide covers the minimum steps to run `skeleton-web` in a production environment.

---

## 1. Environment variables

Copy `.env.example` and edit **every default value** before deploying:

```bash
cp .env.example .env
```

| Variable | Default | What to change |
|---|---|---|
| `SECRET_KEY` | `changeme-secret` | Generate with `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | `changeme` | Set a strong password |
| `POSTGRES_PASSWORD` | `changeme` | Set a strong password |
| `CORS_ORIGINS` | `http://localhost:5173` | Set to your production domain, e.g. `https://myapp.example.com` |
| `APP_ENV` | `development` | Set to `production` |

---

## 2. Deployment options

### Option A — Build on the server (first deploy or no Docker Hub yet)

Suitable for: initial deployment before publishing a release, private repos.

```bash
git clone <repo-url> /srv/myapp && cd /srv/myapp
cp .env.example .env && $EDITOR .env
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

This skips `docker-compose.override.yml` (which mounts local source for dev), builds
production images from the Dockerfiles, and starts all services.

### Option B — Pull pre-built images from Docker Hub (recommended for updates)

After the first `git tag v*` push, CI publishes:
- `manzolo/<repo>-backend:latest`
- `manzolo/<repo>-frontend:latest`

On the server you only need `docker-compose.server.yml` and `.env` — no source code:

```bash
mkdir /srv/myapp && cd /srv/myapp
# copy docker-compose.server.yml and .env from the repo (or curl from GitHub raw)
docker compose -f docker-compose.server.yml pull
docker compose -f docker-compose.server.yml up -d
```

To update after a new release:
```bash
docker compose -f docker-compose.server.yml pull
docker compose -f docker-compose.server.yml up -d
```

---

## 3. Container names and reverse proxy

All services have predictable container names (`<project>-db`, `<project>-backend`,
`<project>-frontend`). The frontend container exposes **no host ports** — route traffic
through a reverse proxy.

**Nginx Proxy Manager / Traefik / Caddy:**
Point the proxy host to `skeleton-web-frontend` on port `80`.

If you prefer a localhost-only port instead of network sharing, add to the frontend service:
```yaml
ports:
  - "127.0.0.1:8080:80"
```

**nginx example config:**
```nginx
server {
    listen 80;
    server_name myapp.example.com;

    location / {
        proxy_pass http://skeleton-web-frontend:80;
        proxy_set_header Host $host;
    }
}
```

---

## 4. Private seed data (gitignored)

To pre-load data that must not be committed (personal info, pricing, etc.),
create `backend/private_seed.py` locally and copy it to the server:

```python
# backend/private_seed.py  (listed in .gitignore)
from sqlalchemy.ext.asyncio import AsyncSession
from src.models import SomeModel

async def seed(db: AsyncSession) -> None:
    db.add(SomeModel(name="Private record"))
```

The seed runner imports this file automatically if present. Safe to omit.

---

## 5. Health and readiness probes

The `/health` endpoint checks database connectivity:

```bash
curl http://localhost:8000/health
# {"status": "ok", "database": "ok", "env": "production"}
```

Suitable for Kubernetes liveness/readiness probes:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 30
```

---

## 6. Security checklist

- [ ] `SECRET_KEY` is a random 32-byte hex string (not the default)
- [ ] `ADMIN_PASSWORD` is changed from `changeme`
- [ ] `CORS_ORIGINS` is set to your actual domain (no wildcard)
- [ ] `APP_ENV=production`
- [ ] HTTPS is terminated at the reverse proxy
- [ ] Database is not exposed on a public port
- [ ] Docker images are rebuilt from a tagged release, not `latest`
- [ ] `private_seed.py` (if used) is copied to the server but never committed
