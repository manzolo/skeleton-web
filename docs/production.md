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

## 2. Start without bind-mounts

The `docker-compose.override.yml` file mounts local source directories into the containers — useful for development, but not suitable for production. Skip it:

```bash
docker compose -f docker-compose.yml up -d
```

This uses only the images built from `Dockerfile`, with no live code injection.

---

## 3. Run migrations

```bash
docker compose -f docker-compose.yml exec backend alembic upgrade head
```

Always run migrations before starting traffic on a new deployment or after an upgrade.

---

## 4. Reverse proxy (nginx example)

Place the API and frontend behind a reverse proxy so both are served from the same origin:

```nginx
server {
    listen 80;
    server_name myapp.example.com;

    # Frontend (Vite built assets served by nginx or Node)
    location / {
        proxy_pass http://frontend:5173;
        proxy_set_header Host $host;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 5. Health and readiness probes

The `/health` endpoint checks database connectivity and is suitable for Kubernetes liveness/readiness probes:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 10
```

Expected response when healthy:

```json
{"status": "ok", "database": "ok", "env": "production"}
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
