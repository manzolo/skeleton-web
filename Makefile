.PHONY: dev test down migrate migrate-new db-shell shell-backend health clean test-backend test-frontend

dev:
	docker compose up --build -d
	docker compose logs -f

test: test-backend test-frontend

test-backend:
	docker compose exec -T backend pytest tests/ -v --tb=short

test-frontend:
	docker compose exec -T frontend npm run test -- --run

down:
	docker compose down

migrate:
	docker compose exec -T backend alembic upgrade head

migrate-new:
	@read -p "Migration name: " name; \
	docker compose exec -T backend alembic revision --autogenerate -m "$$name"

db-shell:
	docker compose exec db psql -U $${POSTGRES_USER:-skeleton} -d $${POSTGRES_DB:-skeletondb}

shell-backend:
	docker compose exec backend bash

health:
	curl -s http://localhost:$${BACKEND_PORT:-8000}/health | python3 -m json.tool

clean:
	docker compose down -v --remove-orphans
	docker system prune -f
