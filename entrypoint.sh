#!/bin/bash
set -euo pipefail

echo "⏳ Waiting for PostgreSQL..."
./wait-for-it.sh db:5432 --timeout=60 -- echo "✅ PostgreSQL is ready."

if [[ $# -gt 0 && "$1" == "alembic" ]]; then
    echo "➡️  Direct alembic command: $*"
    exec "$@"
fi

echo "📦 Running Alembic migrations (upgrade head)..."
alembic upgrade head || {
    echo "❌ Migration failed." >&2
    exit 1
}

echo "🗂️ Ensuring static directories exist..."
mkdir -p static/avatars || true

echo "🌱 Running seed data script (idempotent)..."
python - <<'PY'
from app.database import SessionLocal
from app.services.seed import run_seed
try:
        run_seed(SessionLocal())
except Exception as e:
        print(f"Seed skipped / failed: {e}")
PY

echo "🚀 Starting FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
