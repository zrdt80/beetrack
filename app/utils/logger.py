from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal


LEVEL_RULES = [
    ("error", ["failed", "error"]),
    ("success", ["successful", "created", "updated"]),
    ("warning", ["warning", "skipped"]),
]


def classify_level(event: str) -> str:
    e = event.lower()
    for level, patterns in LEVEL_RULES:
        if any(p in e for p in patterns):
            return level
    return "info"


def log_event(event: str):
    with SessionLocal() as db:
        level = classify_level(event)
        log = models.Log(timestamp=datetime.now(timezone.utc), event=event, level=level)
        db.add(log)
        db.commit()
