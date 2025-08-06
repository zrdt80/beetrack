from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal


def log_event(event: str):
    with SessionLocal() as db:
        # Use datetime.now(timezone.utc) instead of utcnow() for proper UTC
        log = models.Log(timestamp=datetime.now(timezone.utc), event=event)
        db.add(log)
        db.commit()
