from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.services.auth import requires_role
from app.utils.logger import record_audit_event

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/overview")
def admin_overview(
    db: Session = Depends(get_db),
    admin: models.User = Depends(requires_role("admin")),
):
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(days=1)

    users_total = db.query(models.User).count()
    users_by_role = {
        r.value: db.query(models.User).filter(models.User.role == r).count()
        for r in models.UserRole
    }

    active_sessions = db.query(models.UserSession).filter(models.UserSession.is_valid == True).count()
    sessions_last_24h = db.query(models.UserSession).filter(models.UserSession.created_at >= day_ago).count()

    apiaries = db.query(models.Apiary).count()
    hives = db.query(models.Hive).count()
    inspections = db.query(models.Inspection).count()
    orders = db.query(models.Order).count()

    role_requests_pending = db.query(models.RoleChangeRequest).filter(
        models.RoleChangeRequest.status == models.RoleRequestStatus.pending
    ).count()

    recent_audit = db.query(models.AuditEvent).order_by(models.AuditEvent.created_at.desc()).limit(10).all()

    record_audit_event("ADMIN_VIEW_OVERVIEW", actor_user_id=admin.id)

    return {
        "timestamp": now.isoformat(),
        "users": {
            "total": users_total,
            "by_role": users_by_role,
        },
        "sessions": {
            "active": active_sessions,
            "created_last_24h": sessions_last_24h,
        },
        "resources": {
            "apiaries": apiaries,
            "hives": hives,
            "inspections": inspections,
            "orders": orders,
        },
        "role_requests": {
            "pending": role_requests_pending,
        },
        "recent_audit_events": [
            {
                "id": e.id,
                "created_at": e.created_at,
                "event_code": e.event_code,
                "severity": e.severity,
                "user_id": e.user_id,
                "actor_user_id": e.actor_user_id,
                "ip_address": e.ip_address,
            }
            for e in recent_audit
        ],
    }


@router.get("/audit/recent")
def admin_recent_audit(
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    admin: models.User = Depends(requires_role("admin")),
):
    events: List[models.AuditEvent] = (
        db.query(models.AuditEvent)
        .order_by(models.AuditEvent.created_at.desc())
        .limit(limit)
        .all()
    )

    record_audit_event("ADMIN_VIEW_AUDIT_RECENT", actor_user_id=admin.id, metadata={"limit": limit})

    return [
        {
            "id": e.id,
            "created_at": e.created_at,
            "event_code": e.event_code,
            "severity": e.severity,
            "user_id": e.user_id,
            "actor_user_id": e.actor_user_id,
            "session_id": e.session_id,
            "ip_address": e.ip_address,
            "user_agent": e.user_agent,
            "metadata": e.metadata_json,
        }
        for e in events
    ]


@router.get("/sessions/active")
def admin_active_sessions(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=500),
    admin: models.User = Depends(requires_role("admin")),
):
    sessions: List[models.UserSession] = (
        db.query(models.UserSession)
        .filter(models.UserSession.is_valid == True)
        .order_by(models.UserSession.last_activity.desc())
        .limit(limit)
        .all()
    )

    record_audit_event("ADMIN_VIEW_SESSIONS_ACTIVE", actor_user_id=admin.id, metadata={"limit": limit})

    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "created_at": s.created_at,
            "last_activity": s.last_activity,
            "expires_at": s.expires_at,
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
            "device_info": s.device_info,
        }
        for s in sessions
    ]


@router.post("/sessions/{session_id}/revoke")
def admin_revoke_session(
    session_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(requires_role("admin")),
):
    session = db.query(models.UserSession).filter(models.UserSession.id == session_id).first()
    if not session:
        return {"status": "not_found"}
    if not session.is_valid:
        return {"status": "already_revoked"}
    session.is_valid = False
    db.add(session)
    db.commit()
    record_audit_event("ADMIN_REVOKE_SESSION", actor_user_id=admin.id, user_id=session.user_id, session_id=session.id)
    return {"status": "revoked", "session_id": session.id}


@router.post("/users/{user_id}/role")
def admin_change_user_role(
    user_id: int,
    new_role: models.UserRole,
    db: Session = Depends(get_db),
    admin: models.User = Depends(requires_role("admin")),
):
    if user_id == admin.id:
        return {"status": "forbidden", "reason": "cannot_change_own_role"}

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return {"status": "not_found"}

    if user.role == models.UserRole.admin and new_role != models.UserRole.admin:
        admin_count = db.query(models.User).filter(models.User.role == models.UserRole.admin, models.User.is_active == True).count()
        if admin_count <= 1:
            return {"status": "forbidden", "reason": "cannot_demote_last_admin"}

    old_role = user.role
    user.role = new_role
    db.add(user)
    db.commit()
    record_audit_event(
        "ADMIN_CHANGE_USER_ROLE",
        actor_user_id=admin.id,
        user_id=user.id,
        metadata={"from": old_role.value if hasattr(old_role, 'value') else str(old_role), "to": new_role.value if hasattr(new_role, 'value') else str(new_role)}
    )
    return {"status": "updated", "user_id": user.id, "from": str(old_role), "to": str(new_role)}
