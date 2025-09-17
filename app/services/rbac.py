from typing import Set, Callable, List
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app import models
from app.services.auth import get_current_user
from app.database import get_db

class Perm:
    ADMIN_VIEW_OVERVIEW = "admin.view_overview"
    ADMIN_VIEW_AUDIT = "admin.view_audit"
    ADMIN_VIEW_SESSIONS = "admin.view_sessions"
    ADMIN_MANAGE_SESSIONS = "admin.manage_sessions"
    ADMIN_MANAGE_ROLES = "admin.manage_roles"
    ADMIN_MANAGE_PERMISSIONS = "admin.manage_permissions"
    
    USERS_VIEW = "users.view"
    USERS_MANAGE = "users.manage"
    
    APIARIES_VIEW = "apiaries.view"
    APIARIES_CREATE = "apiaries.create"
    APIARIES_MANAGE = "apiaries.manage"
    
    HIVES_VIEW = "hives.view"
    HIVES_CREATE = "hives.create"
    HIVES_MANAGE = "hives.manage"
    
    INSPECTIONS_VIEW = "inspections.view"
    INSPECTIONS_CREATE = "inspections.create"
    INSPECTIONS_MANAGE = "inspections.manage"
    
    ORDERS_VIEW = "orders.view"
    ORDERS_CREATE = "orders.create"
    ORDERS_MANAGE = "orders.manage"


def get_user_permissions(user: models.User, db: Session) -> Set[str]:
    assignments = db.query(models.UserRoleAssignment).filter(
        models.UserRoleAssignment.user_id == user.id,
        models.UserRoleAssignment.is_active == True
    ).all()
    
    permissions = set()
    for assignment in assignments:
        role_perms = db.query(models.RolePermission).filter(
            models.RolePermission.role_id == assignment.role_id
        ).all()
        
        for role_perm in role_perms:
            permission = db.query(models.Permission).filter(
                models.Permission.id == role_perm.permission_id
            ).first()
            if permission:
                permissions.add(permission.name)
    
    return permissions


def requires_permission(permission: str) -> Callable[[models.User, Session], models.User]:
    def dependency(
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> models.User:
        user_permissions = get_user_permissions(current_user, db)
        if permission not in user_permissions:
            raise HTTPException(
                status_code=403, 
                detail={
                    "code": "INSUFFICIENT_PERMISSIONS",
                    "message": f"Permission '{permission}' required",
                    "required_permission": permission
                }
            )
        return current_user
    return dependency


def check_permission(user: models.User, permission: str, db: Session) -> bool:
    user_permissions = get_user_permissions(user, db)
    return permission in user_permissions


def list_user_permissions(user: models.User, db: Session) -> List[str]:
    return list(get_user_permissions(user, db))
