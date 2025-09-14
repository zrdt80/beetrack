from datetime import datetime, timezone
import json
import logging
import sys
from typing import Any, Dict, Optional
from app.database import SessionLocal
from app import models
from app.config import settings

LEVEL_RULES = [
    ("ERROR", ["failed", "error", "rejected"]),
    ("WARNING", ["warning", "skipped", "canceled"]),
    ("INFO", ["successful", "created", "updated", "approved"]),
]


def classify_level(event: str) -> str:
    e = event.lower()
    for level, patterns in LEVEL_RULES:
        if any(p in e for p in patterns):
            return level
    return "INFO"


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "msg": record.getMessage(),
            "logger": record.name,
        }
        if record.exc_info:
            payload["exc_type"] = record.exc_info[0].__name__ if record.exc_info[0] else None
        return json.dumps(payload, separators=(",", ":"))


_logger = logging.getLogger("beetrack")
if not _logger.handlers:
    _logger.setLevel(getattr(logging, settings.log_level, logging.INFO))
    handler = logging.StreamHandler(sys.stdout)
    if settings.log_json:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    _logger.addHandler(handler)


def log_event(event: str, *, level: Optional[str] = None):
    lvl = (level or classify_level(event)).upper()
    if lvl not in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"):
        lvl = "INFO"
    _logger.log(getattr(logging, lvl, logging.INFO), event)

    if settings.log_db_events:
        try:
            with SessionLocal() as db:
                log = models.Log(timestamp=datetime.now(timezone.utc), event=event, level=lvl.lower())
                db.add(log)
                db.commit()
        except Exception:
            _logger.debug("Failed to persist log event", exc_info=True)


def record_audit_event(event_code: str, *, user_id: int | None = None, actor_user_id: int | None = None,
                       session_id: int | None = None, severity: str = "info", ip: str | None = None,
                       user_agent: str | None = None, metadata: Dict[str, Any] | None = None):
    if not settings.log_db_events:
        return
    payload = None
    if metadata:
        try:
            payload = json.dumps(metadata, separators=(",", ":"))
        except Exception:
            payload = None
    try:
        with SessionLocal() as db:
            evt = models.AuditEvent(
                user_id=user_id,
                actor_user_id=actor_user_id,
                session_id=session_id,
                event_code=event_code,
                severity=severity,
                ip_address=ip,
                user_agent=user_agent,
                metadata_json=payload,
            )
            db.add(evt)
            db.commit()
    except Exception:
        pass
