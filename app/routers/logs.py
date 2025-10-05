from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app import models, schemas
from app.database import get_db
from app.services.auth import requires_role
from app.utils.logger import log_event
from typing import List

router = APIRouter()


@router.get("/", response_model=schemas.LogCursorPage)
def get_logs(
    limit: int = Query(50, ge=1, le=200),
    after_id: int | None = Query(None, description="Return logs with id < after_id for pagination"),
    q: str | None = Query(None, description="Full-text search within event message"),
    level: str | None = Query(None, description="Filter by level: info|success|error|warning"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    base_query = db.query(models.Log).order_by(models.Log.id.desc())
    if level:
        base_query = base_query.filter(models.Log.level == level)
    if q:
        like = f"%{q.lower()}%"
        base_query = base_query.filter(func.lower(models.Log.event).like(like))
    if after_id is not None:
        base_query = base_query.filter(models.Log.id < after_id)
    rows = base_query.limit(limit + 1).all()
    has_next = len(rows) > limit
    items = rows[:limit]
    next_cursor = items[-1].id if has_next else None
    log_event(
        f"Logs requested by admin {current_user.username} limit={limit} after_id={after_id} q={q} level={level} returned={len(items)} has_next={has_next}"
    )
    return {
        "meta": {"limit": limit, "has_next": has_next, "next_cursor": next_cursor},
        "items": [
            {"id": log.id, "timestamp": log.timestamp, "event": log.event, "level": log.level} for log in items
        ],
    }


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
    log = db.get(models.Log, log_id)
    if not log:
        log_event(f"Log deletion failed: log {log_id} not found, attempted by admin {current_user.username}")
        raise HTTPException(status_code=404, detail="Log not found")
    
    db.delete(log)
    db.commit()
    log_event(f"Log deleted: ID {log_id} by admin {current_user.username}")
    return


@router.get("/stats", response_model=schemas.LogStats)
def get_log_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    q = db.query(
        func.count(models.Log.id).label('total'),
        func.sum(case((models.Log.level == 'success', 1), else_=0)).label('success'),
        func.sum(case((models.Log.level == 'error', 1), else_=0)).label('error'),
        func.sum(case((models.Log.level == 'warning', 1), else_=0)).label('warning'),
    )
    row = q.one()
    info_count = (row.total or 0) - ((row.success or 0) + (row.error or 0) + (row.warning or 0))
    return {
        'total': row.total or 0,
        'success': row.success or 0,
        'error': row.error or 0,
        'warning': row.warning or 0,
        'info': info_count,
    }
