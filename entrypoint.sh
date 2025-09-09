#!/bin/bash
set -euo pipefail

echo "⏳ Waiting for PostgreSQL..."
./wait-for-it.sh db:5432 --timeout=60 -- echo "✅ PostgreSQL is ready."

if [[ $# -gt 0 && "$1" == "alembic" ]]; then
    echo "➡️  Direct alembic command: $*"
    exec "$@"
fi

echo "📦 Running Alembic migrations (upgrade head)..."
if ! alembic upgrade head; then
    echo "❌ Migration failed. Attempting to create tables directly..."
    python -c "
from app.database import engine
from app.models import Base
try:
    Base.metadata.create_all(bind=engine)
    print('✅ Tables created directly via SQLAlchemy')
except Exception as e:
    print(f'❌ Failed to create tables: {e}')
    exit(1)
"
fi

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
