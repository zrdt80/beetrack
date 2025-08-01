from datetime import datetime
from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal


def log_event(event: str):
    with SessionLocal() as db:
        log = models.Log(timestamp=datetime.utcnow(), event=event)
        db.add(log)
        db.commit()
