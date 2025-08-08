#!/bin/bash
set -e

echo "⏳ Waiting for PostgreSQL..."
./wait-for-it.sh db:5432 --timeout=30 -- echo "✅ PostgreSQL is ready."

# alembic revision --autogenerate -m "Add is_active to users"

# echo "📦 Running Alembic migrations..."
# alembic upgrade head

python -c "from app.database import SessionLocal; from app.services.seed import run_seed; run_seed(SessionLocal())"

echo "🚀 Starting FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
