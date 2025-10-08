from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app import models, schemas
from app.services.rbac import requires_permission, Perm, get_user_permissions
from app.services.cached_queries import (
    get_user_permissions_cached,
    invalidate_user_cache,
)
from app.utils.logger import log_event, record_audit_event
import json
import io
import csv

router = APIRouter(prefix="/admin/rbac", tags=["Admin RBAC"])


@router.get("/permissions", response_model=List[schemas.PermissionRead])
async def list_permissions(
    category: Optional[str] = Query(None, description="Filter by permission category"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        requires_permission(Perm.ADMIN_MANAGE_PERMISSIONS)
    ),
):
    query = db.query(models.Permission)

    if category:
        query = query.filter(models.Permission.category == category)

    permissions = query.order_by(
        models.Permission.category, models.Permission.name
    ).all()

    log_event(
        f"Admin {current_user.username} listed permissions (category: {category})"
    )
    return permissions


@router.get("/permissions/categories")
async def list_permission_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        requires_permission(Perm.ADMIN_MANAGE_PERMISSIONS)
    ),
):
    categories = db.query(models.Permission.category).distinct().all()
    category_list = [cat[0] for cat in categories]

    log_event(f"Admin {current_user.username} listed permission categories")
    return {"categories": category_list}


@router.get("/roles", response_model=List[schemas.RoleRead])
async def list_roles(
    include_permissions: bool = Query(True, description="Include role permissions"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.ADMIN_MANAGE_ROLES)),
):
    query = db.query(models.Role).order_by(models.Role.name)
    if include_permissions:
        query = query.options(
            joinedload(models.Role.role_permissions).joinedload(
                models.RolePermission.permission
            )
        )
    roles = query.all()

    log_event(f"Admin {current_user.username} listed roles")
    return roles


@router.get("/roles/{role_id}", response_model=schemas.RoleRead)
async def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.ADMIN_MANAGE_ROLES)),
):
    role = (
        db.query(models.Role)
        .options(
            joinedload(models.Role.role_permissions).joinedload(
                models.RolePermission.permission
            )
        )
        .filter(models.Role.id == role_id)
        .first()
    )
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    log_event(f"Admin {current_user.username} viewed role {role.name}")
    return role


@router.post("/roles", response_model=schemas.RoleRead)
async def create_role(
    role_data: schemas.RoleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.ADMIN_MANAGE_ROLES)),
):
    existing_role = (
        db.query(models.Role).filter(models.Role.name == role_data.name).first()
    )
    if existing_role:
        raise HTTPException(status_code=400, detail="Role name already exists")

    role = models.Role(
        name=role_data.name,
        description=role_data.description,
        is_system=role_data.is_system,
    )
    db.add(role)
    db.flush()

    for perm_id in role_data.permissions:
        permission = (
            db.query(models.Permission).filter(models.Permission.id == perm_id).first()
        )

        if permission:
            role_perm = models.RolePermission(
                role_id=role.id, permission_id=permission.id
            )
            db.add(role_perm)
        else:
            db.rollback()
            raise HTTPException(
                status_code=400, detail=f"Permission with ID {perm_id} not found"
            )

    db.commit()

    record_audit_event(
        "RBAC_ROLE_CREATED",
        actor_user_id=current_user.id,
        metadata={"role_id": role.id, "role": role.name},
    )

    return await get_role(role.id, db, current_user)


@router.put("/roles/{role_id}", response_model=schemas.RoleRead)
async def update_role(
    role_id: int,
    role_data: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.ADMIN_MANAGE_ROLES)),
):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if role.is_system and role_data.permissions is not None:
        raise HTTPException(
            status_code=400, detail="Cannot modify permissions of system roles"
        )

    if role_data.description is not None:
        role.description = role_data.description

    if role_data.permissions is not None:
        db.query(models.RolePermission).filter(
            models.RolePermission.role_id == role_id
        ).delete()

        for perm_id in role_data.permissions:
            permission = (
                db.query(models.Permission)
                .filter(models.Permission.id == perm_id)
                .first()
            )

            if permission:
                role_perm = models.RolePermission(
                    role_id=role.id, permission_id=permission.id
                )
                db.add(role_perm)
            else:
                db.rollback()
                raise HTTPException(
                    status_code=400, detail=f"Permission with ID {perm_id} not found"
                )

    db.commit()

    log_event(f"Admin {current_user.username} updated role {role.name}")

    record_audit_event(
        "RBAC_ROLE_UPDATED",
        actor_user_id=current_user.id,
        metadata={"role_id": role.id, "role": role.name},
    )

    return await get_role(role.id, db, current_user)


@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.ADMIN_MANAGE_ROLES)),
):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if role.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system roles")

    active_assignments = (
        db.query(models.UserRoleAssignment)
        .filter(
            models.UserRoleAssignment.role_id == role_id,
            models.UserRoleAssignment.is_active == True,
        )
        .count()
    )

    if active_assignments > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete role with {active_assignments} active user assignments",
        )

    role_name = role.name
    db.delete(role)
    db.commit()

    log_event(f"Admin {current_user.username} deleted role {role_name}")

    record_audit_event(
        "RBAC_ROLE_DELETED",
        actor_user_id=current_user.id,
        metadata={"role_id": role_id, "role": role_name},
    )

    return {"message": f"Role '{role_name}' deleted successfully"}


@router.get("/users", response_model=List[schemas.UserWithRoles])
async def list_users_with_roles(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by username or email"),
    role_name: Optional[str] = Query(None, description="Filter by role name"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.ADMIN_MANAGE_ROLES)),
):
    query = db.query(models.User)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.User.username.ilike(search_term),
                models.User.email.ilike(search_term),
            )
        )

    if role_name:
        role = db.query(models.Role).filter(models.Role.name == role_name).first()
        if role:
            query = query.join(models.UserRoleAssignment).filter(
                and_(
                    models.UserRoleAssignment.role_id == role.id,
                    models.UserRoleAssignment.is_active == True,
                )
            )
        else:
            return []

    offset = (page - 1) * size
    users = query.offset(offset).limit(size).all()

    enriched_users = []
    for user in users:
        assignments = (
            db.query(models.UserRoleAssignment)
            .filter(
                models.UserRoleAssignment.user_id == user.id,
                models.UserRoleAssignment.is_active == True,
            )
            .all()
        )

        for assignment in assignments:
            assignment.role = (
                db.query(models.Role)
                .filter(models.Role.id == assignment.role_id)
                .first()
            )

        try:
            uid = int(user.id)
        except Exception:
            uid = user.id
        permissions = await get_user_permissions_cached(db, uid)

        user_roles = [assignment.role for assignment in assignments if assignment.role]

        user.role_assignments = assignments
        user.roles = user_roles
        user.permissions = permissions
        enriched_users.append(user)

    log_event(f"Admin {current_user.username} listed users with roles (page {page})")
    return enriched_users


@router.post("/users/{user_id}/roles/{role_id}")
async def assign_role_to_user(
    user_id: int,
    role_id: int,
    expires_at: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.ADMIN_MANAGE_ROLES)),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    existing_assignment = (
        db.query(models.UserRoleAssignment)
        .filter(
            models.UserRoleAssignment.user_id == user_id,
            models.UserRoleAssignment.role_id == role_id,
            models.UserRoleAssignment.is_active == True,
        )
        .first()
    )

    if existing_assignment:
        raise HTTPException(status_code=400, detail="User already has this role")

    assignment = models.UserRoleAssignment(
        user_id=user_id,
        role_id=role_id,
        assigned_by=current_user.id,
        assigned_at=datetime.now(timezone.utc),
        expires_at=expires_at,
        is_active=True,
    )

    db.add(assignment)
    db.commit()

    log_event(
        f"Admin {current_user.username} assigned role {role.name} to user {user.username}"
    )

    record_audit_event(
        "RBAC_ROLE_ASSIGNED",
        actor_user_id=current_user.id,
        user_id=user.id,
        metadata={
            "role_id": role.id,
            "role": role.name,
            "user_id": user.id,
            "username": user.username,
        },
    )
    try:
        import asyncio

        asyncio.create_task(invalidate_user_cache(int(user.id)))
    except Exception:
        pass

    return {
        "message": f"Role '{role.name}' assigned to user '{user.username}' successfully"
    }


@router.delete("/users/{user_id}/roles/{role_id}")
async def remove_role_from_user(
    user_id: int,
    role_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.ADMIN_MANAGE_ROLES)),
):
    assignment = (
        db.query(models.UserRoleAssignment)
        .filter(
            models.UserRoleAssignment.user_id == user_id,
            models.UserRoleAssignment.role_id == role_id,
            models.UserRoleAssignment.is_active == True,
        )
        .first()
    )

    if not assignment:
        raise HTTPException(status_code=404, detail="Role assignment not found")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    role = db.query(models.Role).filter(models.Role.id == role_id).first()

    assignment.is_active = False
    db.commit()

    log_event(
        f"Admin {current_user.username} removed role {role.name} from user {user.username}"
    )

    record_audit_event(
        "RBAC_ROLE_REMOVED",
        actor_user_id=current_user.id,
        user_id=user.id,
        metadata={
            "role_id": role.id,
            "role": role.name,
            "user_id": user.id,
            "username": user.username,
        },
    )
    try:
        import asyncio

        asyncio.create_task(invalidate_user_cache(int(user.id)))
    except Exception:
        pass

    return {
        "message": f"Role '{role.name}' removed from user '{user.username}' successfully"
    }


@router.get("/overview", response_model=schemas.RBACOverview)
async def get_rbac_overview(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.ADMIN_VIEW_OVERVIEW)),
):
    permissions_count = db.query(models.Permission).count()
    roles_count = db.query(models.Role).count()
    active_assignments_count = (
        db.query(models.UserRoleAssignment)
        .filter(models.UserRoleAssignment.is_active == True)
        .count()
    )

    total_users = db.query(models.User).count()
    active_users = db.query(models.User).filter(models.User.is_active == True).count()
    inactive_users = (
        db.query(models.User).filter(models.User.is_active == False).count()
    )

    users_by_role = {}
    roles = db.query(models.Role).all()
    for role in roles:
        user_count = (
            db.query(models.UserRoleAssignment)
            .filter(
                models.UserRoleAssignment.role_id == role.id,
                models.UserRoleAssignment.is_active == True,
            )
            .count()
        )
        users_by_role[role.name] = user_count

    expired_assignments = (
        db.query(models.UserRoleAssignment)
        .filter(
            models.UserRoleAssignment.is_active == True,
            models.UserRoleAssignment.expires_at < datetime.now(timezone.utc),
        )
        .count()
    )

    user_stats = schemas.UserRoleStats(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        users_by_role=users_by_role,
        active_assignments=active_assignments_count,
        expired_assignments=expired_assignments,
    )

    events = (
        db.query(models.AuditEvent)
        .options(joinedload(models.AuditEvent.actor))
        .filter(models.AuditEvent.event_code.like("RBAC_%"))
        .order_by(models.AuditEvent.created_at.desc())
        .limit(10)
        .all()
    )

    recent_changes = []
    for e in events:
        try:
            meta = json.loads(e.metadata_json) if e.metadata_json else {}
        except Exception:
            meta = {}

        code = e.event_code or ""
        action = ""
        details = ""

        if code == "RBAC_ROLE_ASSIGNED":
            action = "assigned role"
            details = f"{meta.get('role', '?')} → {meta.get('username', 'user')}"
        elif code == "RBAC_ROLE_REMOVED":
            action = "removed role"
            details = f"{meta.get('role', '?')} from {meta.get('username', 'user')}"
        elif code == "RBAC_ROLE_CREATED":
            action = "created role"
            details = f"{meta.get('role', '?')}"
        elif code == "RBAC_ROLE_UPDATED":
            action = "updated role"
            details = f"{meta.get('role', '?')}"
        elif code == "RBAC_ROLE_DELETED":
            action = "deleted role"
            details = f"{meta.get('role', '?')}"
        else:
            action = code.replace("RBAC_", "").replace("_", " ").lower()
            details = meta.get("detail") or meta.get("details") or ""

        recent_changes.append(
            {
                "id": e.id,
                "action": action,
                "details": details,
                "timestamp": (
                    e.created_at.isoformat() if getattr(e, "created_at", None) else None
                ),
                "user_id": e.actor_user_id,
                "username": (
                    e.actor.username
                    if getattr(e, "actor", None) and getattr(e.actor, "username", None)
                    else "system"
                ),
            }
        )

    overview = schemas.RBACOverview(
        permissions_count=permissions_count,
        roles_count=roles_count,
        active_assignments_count=active_assignments_count,
        user_stats=user_stats,
        recent_changes=recent_changes,
    )

    log_event(f"Admin {current_user.username} viewed RBAC overview")
    return overview


@router.get("/matrix", response_model=schemas.RolePermissionMatrix)
async def get_role_permission_matrix(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        requires_permission(Perm.ADMIN_MANAGE_PERMISSIONS)
    ),
):
    roles = (
        db.query(models.Role)
        .options(
            joinedload(models.Role.role_permissions).joinedload(
                models.RolePermission.permission
            )
        )
        .order_by(models.Role.name)
        .all()
    )
    permissions = (
        db.query(models.Permission)
        .order_by(models.Permission.category, models.Permission.name)
        .all()
    )

    matrix = {}
    for role in roles:
        role_perm_ids = {rp.permission_id for rp in role.role_permissions}
        matrix[role.name] = {
            permission.name: (permission.id in role_perm_ids)
            for permission in permissions
        }

    result = schemas.RolePermissionMatrix(
        roles=roles, permissions=permissions, matrix=matrix
    )

    log_event(f"Admin {current_user.username} viewed role-permission matrix")
    return result


@router.get("/changes")
async def list_rbac_changes(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    actor_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    event: Optional[str] = Query(None, description="Filter by exact RBAC_* event code"),
    since: Optional[datetime] = Query(None),
    until: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.ADMIN_VIEW_AUDIT)),
):
    q = (
        db.query(models.AuditEvent)
        .options(joinedload(models.AuditEvent.actor))
        .filter(models.AuditEvent.event_code.like("RBAC_%"))
    )
    if actor_id is not None:
        q = q.filter(models.AuditEvent.actor_user_id == actor_id)
    if user_id is not None:
        q = q.filter(models.AuditEvent.user_id == user_id)
    if event is not None:
        q = q.filter(models.AuditEvent.event_code == event)
    if since is not None:
        q = q.filter(models.AuditEvent.created_at >= since)
    if until is not None:
        q = q.filter(models.AuditEvent.created_at <= until)

    total = q.count()
    offset = (page - 1) * size
    events = (
        q.order_by(models.AuditEvent.created_at.desc()).offset(offset).limit(size).all()
    )

    items = []
    for e in events:
        try:
            meta = json.loads(e.metadata_json) if e.metadata_json else {}
        except Exception:
            meta = {}
        code = e.event_code or ""
        action = code.replace("RBAC_", "").replace("_", " ").lower()
        details = meta.get("details") or meta.get("detail")
        if not details:
            if code == "RBAC_ROLE_ASSIGNED":
                details = f"{meta.get('role', '?')} → {meta.get('username', 'user')}"
            elif code == "RBAC_ROLE_REMOVED":
                details = f"{meta.get('role', '?')} from {meta.get('username', 'user')}"
            elif code in (
                "RBAC_ROLE_CREATED",
                "RBAC_ROLE_UPDATED",
                "RBAC_ROLE_DELETED",
            ):
                details = f"{meta.get('role', '?')}"

        items.append(
            {
                "id": e.id,
                "event_code": e.event_code,
                "action": action,
                "details": details or "",
                "timestamp": (
                    e.created_at.isoformat() if getattr(e, "created_at", None) else None
                ),
                "user_id": e.actor_user_id,
                "username": (
                    e.actor.username
                    if getattr(e, "actor", None) and getattr(e.actor, "username", None)
                    else "system"
                ),
                "target_user_id": e.user_id,
                "metadata": meta,
            }
        )

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/changes/export")
async def export_rbac_changes_csv(
    actor_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    event: Optional[str] = Query(None, description="Filter by exact RBAC_* event code"),
    since: Optional[datetime] = Query(None),
    until: Optional[datetime] = Query(None),
    page: Optional[int] = Query(
        None, ge=1, description="When provided with size, export only this page"
    ),
    size: Optional[int] = Query(
        None,
        ge=1,
        le=200,
        description="When provided with page, export only that page size",
    ),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.ADMIN_VIEW_AUDIT)),
):
    q = (
        db.query(models.AuditEvent)
        .options(joinedload(models.AuditEvent.actor))
        .filter(models.AuditEvent.event_code.like("RBAC_%"))
    )
    if actor_id is not None:
        q = q.filter(models.AuditEvent.actor_user_id == actor_id)
    if user_id is not None:
        q = q.filter(models.AuditEvent.user_id == user_id)
    if event is not None:
        q = q.filter(models.AuditEvent.event_code == event)
    if since is not None:
        q = q.filter(models.AuditEvent.created_at >= since)
    if until is not None:
        q = q.filter(models.AuditEvent.created_at <= until)

    header = [
        "id",
        "timestamp",
        "username",
        "actor_user_id",
        "event_code",
        "action",
        "details",
        "target_user_id",
    ]

    def row_for_event(e: models.AuditEvent):
        try:
            meta = json.loads(e.metadata_json) if e.metadata_json else {}
        except Exception:
            meta = {}
        code = e.event_code or ""
        action = code.replace("RBAC_", "").replace("_", " ").lower()
        details = meta.get("details") or meta.get("detail")
        if not details:
            if code == "RBAC_ROLE_ASSIGNED":
                details = f"{meta.get('role', '?')} → {meta.get('username', 'user')}"
            elif code == "RBAC_ROLE_REMOVED":
                details = f"{meta.get('role', '?')} from {meta.get('username', 'user')}"
            elif code in (
                "RBAC_ROLE_CREATED",
                "RBAC_ROLE_UPDATED",
                "RBAC_ROLE_DELETED",
            ):
                details = f"{meta.get('role', '?')}"
        username = (
            e.actor.username
            if getattr(e, "actor", None) and getattr(e.actor, "username", None)
            else "system"
        )
        ts = e.created_at.isoformat() if getattr(e, "created_at", None) else None
        return [
            e.id,
            ts,
            username,
            e.actor_user_id,
            e.event_code,
            action,
            details or "",
            e.user_id,
        ]

    def iter_csv():
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(header)
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)

        query = q.order_by(models.AuditEvent.created_at.desc())
        if page is not None and size is not None:
            offset = (page - 1) * size
            query = query.offset(offset).limit(size)
        else:
            query = query.yield_per(1000)

        for e in query:
            writer.writerow(row_for_event(e))
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)

    filename = "rbac_changes.csv"
    response = StreamingResponse(iter_csv(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response
