#!/bin/bash
set -e

echo "⏳ Czekam na PostgreSQL..."
./wait-for-it.sh db:5432 --timeout=30 -- echo "✅ PostgreSQL gotowy."

echo "📦 Uruchamiam migracje Alembic..."
# alembic upgrade head

python -c "from app.database import SessionLocal; from app.services.seed import run_seed; run_seed(SessionLocal())"

echo "🚀 Startuję FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
