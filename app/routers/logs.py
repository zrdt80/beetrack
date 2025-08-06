from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models
from app.database import get_db
from app.services.auth import requires_role
from app.utils.logger import log_event
from typing import List

router = APIRouter()


@router.get("/", response_model=List[dict])
def get_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    logs = db.query(models.Log).order_by(models.Log.timestamp.desc()).all()
    log_event(f"Logs requested by admin {current_user.username}, returned {len(logs)} logs")
    return [{"id": log.id, "timestamp": log.timestamp.isoformat(), "event": log.event} for log in logs]


@router.delete("/clear", status_code=status.HTTP_204_NO_CONTENT)
def clear_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    log_count = db.query(models.Log).count()
    db.query(models.Log).delete()
    db.commit()
    log_event(f"All logs cleared by admin {current_user.username} ({log_count} logs removed)")
    return


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    log = db.query(models.Log).get(log_id)
    if not log:
        log_event(f"Log deletion failed: log {log_id} not found, attempted by admin {current_user.username}")
        raise HTTPException(status_code=404, detail="Log not found")
    
    db.delete(log)
    db.commit()
    log_event(f"Log deleted: ID {log_id} by admin {current_user.username}")
    return
