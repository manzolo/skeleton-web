#!/bin/bash
set -e

# Extract connection params from DATABASE_URL
# Format: postgresql+asyncpg://user:pass@host:port/dbname
DB_URL="${DATABASE_URL}"
DB_HOST=$(echo "$DB_URL" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "$DB_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_USER=$(echo "$DB_URL" | sed -E 's|.*//([^:]+):.*|\1|')
DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^/]+)$|\1|')

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q; do
  sleep 1
done
echo "PostgreSQL is ready."

echo "Running Alembic migrations..."
alembic upgrade head

echo "Running seed..."
python -m src.seed

echo "Starting Uvicorn..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
