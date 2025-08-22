from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import sqlalchemy as sa
from app.database import get_db
from app import models, schemas
from app.services import auth
from app.utils.logger import log_event

router = APIRouter()

REJECTION_TEMPLATES = [
    "Insufficient experience details provided",
    "Current workload does not justify additional worker role",
    "Incomplete profile information – please update profile first",
    "Need demonstrated activity over the next 30 days",
]


@router.get("/templates/rejections", response_model=list[str])
def get_rejection_templates(_: models.User = Depends(auth.requires_role("admin"))):
    return REJECTION_TEMPLATES


@router.post("/", response_model=schemas.RoleRequestRead)
def create_role_request(
    payload: schemas.RoleRequestCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if payload.to_role == current_user.role:
        raise HTTPException(status_code=400, detail="You already have that role")
    if current_user.role == models.UserRole.admin:
        raise HTTPException(status_code=400, detail="Admin cannot change role via request")

    existing = db.query(models.RoleChangeRequest).filter(
        models.RoleChangeRequest.user_id == current_user.id,
        models.RoleChangeRequest.status == models.RoleRequestStatus.pending
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending request")

    last_request = db.query(models.RoleChangeRequest).filter(
        models.RoleChangeRequest.user_id == current_user.id
    ).order_by(models.RoleChangeRequest.created_at.desc()).first()
    if last_request:
        last_created_at = last_request.created_at
        if last_created_at.tzinfo is None:
            last_created_at = last_created_at.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        delta = now_utc - last_created_at
        if delta.total_seconds() < 24 * 3600:
            remaining_hours = round((24 * 3600 - delta.total_seconds()) / 3600, 2)
            raise HTTPException(status_code=429, detail=f"You can submit a new request in {remaining_hours} hours")

    r = models.RoleChangeRequest(
        user_id=current_user.id,
        from_role=current_user.role,
        to_role=payload.to_role,
        status=models.RoleRequestStatus.pending,
        reason=payload.reason,
        created_at=datetime.now(timezone.utc)
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    log_event(f"Role change request created by {current_user.username} from {current_user.role} to {payload.to_role}")
    return r


@router.get("/me", response_model=list[schemas.RoleRequestRead])
def list_my_role_requests(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(models.RoleChangeRequest).filter(
        models.RoleChangeRequest.user_id == current_user.id
    ).order_by(models.RoleChangeRequest.created_at.desc()).all()
    return items


@router.get("/me/page", response_model=schemas.RoleRequestPage)
def list_my_role_requests_page(
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=100),
    order: str = Query("-created_at", pattern="^-?(created_at|decided_at|id)$"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.RoleChangeRequest).filter(
        models.RoleChangeRequest.user_id == current_user.id
    )
    direction = sa.desc if order.startswith("-") else sa.asc
    field = order.lstrip("-")
    order_col = {
        "created_at": models.RoleChangeRequest.created_at,
        "decided_at": models.RoleChangeRequest.decided_at,
        "id": models.RoleChangeRequest.id,
    }[field]
    query = query.order_by(direction(order_col))

    total = query.order_by(None).count()
    items = query.limit(size).offset((page - 1) * size).all()
    pages = (total + size - 1) // size if size else 0
    return {
        "meta": {
            "page": page,
            "size": size,
            "total": total,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        },
        "items": items,
    }


@router.get("/", response_model=schemas.RoleRequestPage)
def list_role_requests(
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=100),
    status: schemas.RoleRequestStatus | None = Query(None, description="Single status filter (deprecated in favor of statuses)"),
    statuses: list[schemas.RoleRequestStatus] | None = Query(None, description="Multiple statuses, repeat query param e.g. ?statuses=pending&statuses=approved"),
    user_id: int | None = Query(None),
    username: str | None = Query(None, description="Case-insensitive substring match"),
    from_role: models.UserRole | None = Query(None),
    to_role: models.UserRole | None = Query(None),
    created_from: datetime | None = Query(None),
    created_to: datetime | None = Query(None),
    decided: bool | None = Query(None, description="If true only decided (non-pending); if false only pending"),
    order: str = Query("-created_at", pattern="^-?(created_at|decided_at|id)$"),
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.requires_role("admin"))
):
    query = db.query(models.RoleChangeRequest)
    if username:
        query = query.join(
            models.User,
            models.RoleChangeRequest.user_id == models.User.id
        )
        query = query.filter(models.User.username.ilike(f"%{username}%"))
    if user_id:
        query = query.filter(models.RoleChangeRequest.user_id == user_id)
    if statuses:
        query = query.filter(models.RoleChangeRequest.status.in_(statuses))
    elif status:
        query = query.filter(models.RoleChangeRequest.status == status)
    if from_role:
        query = query.filter(models.RoleChangeRequest.from_role == from_role)
    if to_role:
        query = query.filter(models.RoleChangeRequest.to_role == to_role)
    if created_from:
        query = query.filter(models.RoleChangeRequest.created_at >= created_from)
    if created_to:
        query = query.filter(models.RoleChangeRequest.created_at <= created_to)
    if decided is True:
        query = query.filter(models.RoleChangeRequest.status != models.RoleRequestStatus.pending)
    if decided is False:
        query = query.filter(models.RoleChangeRequest.status == models.RoleRequestStatus.pending)

    direction = sa.desc if order.startswith("-") else sa.asc
    field = order.lstrip("-")
    order_col = {
        "created_at": models.RoleChangeRequest.created_at,
        "decided_at": models.RoleChangeRequest.decided_at,
        "id": models.RoleChangeRequest.id,
    }[field]
    query = query.order_by(direction(order_col))

    total = query.order_by(None).count()
    items = query.limit(size).offset((page - 1) * size).all()
    pages = (total + size - 1) // size if size else 0
    return {
        "meta": {
            "page": page,
            "size": size,
            "total": total,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        },
        "items": items,
    }


@router.get("/me/notifications")
def my_role_request_notifications(
    since_minutes: int = Query(1440, ge=1, le=7*24*60, description="Window to look back for updates (default 24h)"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=since_minutes)
    rows = db.query(models.RoleChangeRequest).filter(
        models.RoleChangeRequest.user_id == current_user.id,
        models.RoleChangeRequest.decided_at.isnot(None),
        models.RoleChangeRequest.decided_at >= cutoff
    ).order_by(models.RoleChangeRequest.decided_at.desc()).all()
    return [
        {
            "id": r.id,
            "status": r.status,
            "decided_at": r.decided_at,
            "admin_comment": r.admin_comment,
            "to_role": r.to_role,
        }
        for r in rows
    ]


@router.post("/{request_id}/decision", response_model=schemas.RoleRequestRead)
def decide_role_request(
    request_id: int,
    decision: schemas.RoleRequestDecision,
    admin_user: models.User = Depends(auth.requires_role("admin")),
    db: Session = Depends(get_db)
):
    r = db.query(models.RoleChangeRequest).filter(models.RoleChangeRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r.status != models.RoleRequestStatus.pending:
        raise HTTPException(status_code=400, detail="Request already decided or canceled")

    if not decision.approve:
        if not decision.admin_comment or len(decision.admin_comment.strip()) < 10:
            raise HTTPException(status_code=422, detail="Rejection requires a comment of at least 10 characters")

    r.status = models.RoleRequestStatus.approved if decision.approve else models.RoleRequestStatus.rejected
    r.admin_comment = decision.admin_comment
    r.decided_by = admin_user.id
    r.decided_at = datetime.now(timezone.utc)
    db.add(r)

    if decision.approve:
        user = db.query(models.User).filter(models.User.id == r.user_id).first()
        if user:
            user.role = r.to_role
            db.add(user)

    db.commit()
    db.refresh(r)
    log_event(f"Role change request {r.id} {r.status} by admin {admin_user.username} for user_id={r.user_id}")
    return r


@router.post("/{request_id}/cancel", response_model=schemas.RoleRequestRead)
def cancel_role_request(
    request_id: int,
    payload: schemas.RoleRequestCancel | None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    r = db.query(models.RoleChangeRequest).filter(
        models.RoleChangeRequest.id == request_id,
        models.RoleChangeRequest.user_id == current_user.id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    if r.status != models.RoleRequestStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending requests can be canceled")
    r.status = models.RoleRequestStatus.canceled
    if payload and payload.reason:
        r.reason = (r.reason + "\n[CANCELED] " + payload.reason) if r.reason else payload.reason
    r.decided_at = datetime.now(timezone.utc)
    db.add(r)
    db.commit()
    db.refresh(r)
    log_event(f"Role change request {r.id} canceled by user {current_user.username}")
    return r


@router.get("/stats/summary")
def role_request_summary(_: models.User = Depends(auth.requires_role("admin")), db: Session = Depends(get_db)):
    counts = {s.value: 0 for s in models.RoleRequestStatus}
    rows = db.query(models.RoleChangeRequest.status, sa.func.count(models.RoleChangeRequest.id)).group_by(models.RoleChangeRequest.status).all()
    for status, cnt in rows:
        counts[status.value if hasattr(status, 'value') else status] = cnt
    counts["total"] = sum(v for k, v in counts.items() if k in [s.value for s in models.RoleRequestStatus])
    return counts


@router.get("/stats/daily")
def role_request_daily(
    days: int = Query(14, ge=1, le=90),
    _: models.User = Depends(auth.requires_role("admin")),
    db: Session = Depends(get_db)
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.query(
        sa.func.date(models.RoleChangeRequest.created_at).label("day"),
        models.RoleChangeRequest.status,
        sa.func.count(models.RoleChangeRequest.id)
    ).filter(models.RoleChangeRequest.created_at >= cutoff).group_by("day", models.RoleChangeRequest.status).order_by("day").all()
    by_day = {}
    for day, status, cnt in rows:
        key = str(day)
        if key not in by_day:
            by_day[key] = {s.value: 0 for s in models.RoleRequestStatus}
            by_day[key]["date"] = key
        by_day[key][status.value if hasattr(status, 'value') else status] = cnt
    ordered = [by_day[k] for k in sorted(by_day.keys())]
    return ordered


@router.get("/me/summary")
def my_role_request_summary(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    total = db.query(models.RoleChangeRequest).filter(models.RoleChangeRequest.user_id == current_user.id).count()
    pending = db.query(models.RoleChangeRequest).filter(models.RoleChangeRequest.user_id == current_user.id, models.RoleChangeRequest.status == models.RoleRequestStatus.pending).count()
    last = db.query(models.RoleChangeRequest).filter(models.RoleChangeRequest.user_id == current_user.id).order_by(models.RoleChangeRequest.created_at.desc()).first()
    return {
        "total": total,
        "pending": pending,
        "last_status": last.status if last else None,
        "last_decided_at": last.decided_at if last else None,
        "last_created_at": last.created_at if last else None,
    }
