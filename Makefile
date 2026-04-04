.PHONY: help dev up build down logs restart ps test test-backend test-frontend \
        lint lint-backend lint-frontend \
        migrate migrate-new db-shell shell-backend health seed openapi clean \
        demo demo-clean

# ─── colours ────────────────────────────────────────────────────────────────
BOLD  := \033[1m
RESET := \033[0m
CYAN  := \033[36m
GREEN := \033[32m

# ─── default target ─────────────────────────────────────────────────────────
help:
	@printf "$(BOLD)skeleton-web$(RESET) — available targets\n\n"
	@printf "  $(CYAN)make dev$(RESET)           build + start + follow logs (first run)\n"
	@printf "  $(CYAN)make build$(RESET)         rebuild all images\n"
	@printf "  $(CYAN)make up$(RESET)            start containers (no rebuild)\n"
	@printf "  $(CYAN)make down$(RESET)          stop and remove containers\n"
	@printf "  $(CYAN)make restart$(RESET)       down + up\n"
	@printf "  $(CYAN)make logs$(RESET)          follow all container logs\n"
	@printf "  $(CYAN)make ps$(RESET)            show container status\n"
	@printf "\n"
	@printf "  $(CYAN)make test$(RESET)          run backend + frontend tests\n"
	@printf "  $(CYAN)make test-backend$(RESET)  pytest inside backend container\n"
	@printf "  $(CYAN)make test-frontend$(RESET) vitest inside frontend container\n"
	@printf "  $(CYAN)make lint$(RESET)          ruff + eslint\n"
	@printf "  $(CYAN)make lint-backend$(RESET)  ruff check src/ tests/\n"
	@printf "  $(CYAN)make lint-frontend$(RESET) eslint src/\n"
	@printf "\n"
	@printf "  $(CYAN)make migrate$(RESET)       alembic upgrade head\n"
	@printf "  $(CYAN)make migrate-new$(RESET)   create a new migration (prompts for name)\n"
	@printf "  $(CYAN)make health$(RESET)        GET /health and pretty-print JSON\n"
	@printf "  $(CYAN)make seed$(RESET)          run database seeder\n"
	@printf "  $(CYAN)make openapi$(RESET)       dump OpenAPI spec to docs/openapi.json\n"
	@printf "\n"
	@printf "  $(CYAN)make db-shell$(RESET)      psql into the database\n"
	@printf "  $(CYAN)make shell-backend$(RESET) bash into the backend container\n"
	@printf "\n"
	@printf "  $(CYAN)make clean$(RESET)         down -v + docker system prune\n"
	@printf "\n"
	@printf "  $(CYAN)make demo$(RESET)          apply Products demo feature on a fresh clone\n"
	@printf "  $(CYAN)make demo-clean$(RESET)    undo Products demo and restore original state\n"
	@printf "\n"
	@printf "$(BOLD)Endpoints$(RESET)\n"
	@printf "  Swagger UI  http://localhost:$${BACKEND_PORT:-8000}/docs\n"
	@printf "  ReDoc       http://localhost:$${BACKEND_PORT:-8000}/redoc\n"
	@printf "  Health      http://localhost:$${BACKEND_PORT:-8000}/health\n"

# ─── lifecycle ───────────────────────────────────────────────────────────────

# Local dev uses docker-compose.override.yml automatically (bind-mounts src/ tests/ etc.)
# CI/prod uses docker-compose.yml alone: docker compose -f docker-compose.yml ...

dev: build up logs

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart: down up

logs:
	docker compose logs -f

ps:
	docker compose ps

# ─── tests ───────────────────────────────────────────────────────────────────

test: test-backend test-frontend

test-backend:
	docker compose exec -T backend pytest tests/ -v --tb=short

test-frontend:
	docker compose exec -T frontend npm run test -- --run

lint: lint-backend lint-frontend

lint-backend:
	docker compose exec -T backend ruff check src/ tests/

lint-frontend:
	docker compose exec -T frontend npm run lint

# ─── database ────────────────────────────────────────────────────────────────

migrate:
	docker compose exec -T backend alembic upgrade head

migrate-new:
	@read -p "Migration name: " name; \
	docker compose exec -T backend alembic revision --autogenerate -m "$$name"

db-shell:
	docker compose exec db psql -U $${POSTGRES_USER:-skeleton} -d $${POSTGRES_DB:-skeletondb}

# ─── utilities ───────────────────────────────────────────────────────────────

shell-backend:
	docker compose exec backend bash

health:
	curl -s http://localhost:$${BACKEND_PORT:-8000}/health | python3 -m json.tool

seed:
	docker compose exec -T backend python -m src.seed

openapi:
	docker compose exec -T backend python -c \
	  "from src.main import app; import json; print(json.dumps(app.openapi(), indent=2))" \
	  > docs/openapi.json
	@echo "Spec saved to docs/openapi.json"

clean:
	docker compose down -v --remove-orphans
	docker system prune -f

# ─── demo ─────────────────────────────────────────────────────────────────────

demo:
	@bash scripts/demo-products.sh

demo-clean:
	@bash scripts/demo-products-clean.sh
