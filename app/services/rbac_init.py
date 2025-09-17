from sqlalchemy.orm import Session
from sqlalchemy import inspect
from typing import Dict, List
from datetime import datetime, timezone
from app import models
from app.services.rbac import Perm
from app.utils.logger import log_event
from app.database import engine


def check_rbac_tables_exist() -> bool:
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        required_tables = ['roles', 'permissions', 'role_permissions', 'user_role_assignments']
        missing_tables = [table for table in required_tables if table not in existing_tables]
        
        if missing_tables:
            print(f"⚠️ Missing RBAC tables: {missing_tables}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Error checking RBAC tables: {e}")
        return False


def get_permission_definitions() -> Dict[str, Dict]:
    return {
        "admin": {
            Perm.ADMIN_VIEW_OVERVIEW: "View admin dashboard and system overview",
            Perm.ADMIN_VIEW_AUDIT: "View audit logs and system events",
            Perm.ADMIN_VIEW_SESSIONS: "View user sessions and login activity",
            Perm.ADMIN_MANAGE_SESSIONS: "Manage user sessions (terminate, etc.)",
            Perm.ADMIN_MANAGE_ROLES: "Manage user roles and role assignments",
            Perm.ADMIN_MANAGE_PERMISSIONS: "Manage permissions and role permissions"
        },
        "users": {
            Perm.USERS_VIEW: "View user profiles and information",
            Perm.USERS_MANAGE: "Manage user accounts (create, update, delete)"
        },
        "apiaries": {
            Perm.APIARIES_VIEW: "View apiaries and basic information",
            Perm.APIARIES_CREATE: "Create new apiaries",
            Perm.APIARIES_MANAGE: "Manage apiaries (update, delete, settings)"
        },
        "hives": {
            Perm.HIVES_VIEW: "View hives and their information",
            Perm.HIVES_CREATE: "Create new hives",
            Perm.HIVES_MANAGE: "Manage hives (update, delete, move)"
        },
        "inspections": {
            Perm.INSPECTIONS_VIEW: "View inspection records",
            Perm.INSPECTIONS_CREATE: "Create new inspection records",
            Perm.INSPECTIONS_MANAGE: "Manage inspections (update, delete)"
        },
        "orders": {
            Perm.ORDERS_VIEW: "View orders and order history",
            Perm.ORDERS_CREATE: "Create new orders",
            Perm.ORDERS_MANAGE: "Manage orders (update status, cancel, etc.)"
        }
    }


def get_default_roles() -> Dict[str, Dict]:
    return {
        "admin": {
            "name": "Administrator",
            "description": "Full system access with all permissions",
            "permissions": [
                Perm.ADMIN_VIEW_OVERVIEW,
                Perm.ADMIN_VIEW_AUDIT,
                Perm.ADMIN_VIEW_SESSIONS,
                Perm.ADMIN_MANAGE_SESSIONS,
                Perm.ADMIN_MANAGE_ROLES,
                Perm.ADMIN_MANAGE_PERMISSIONS,
                Perm.USERS_VIEW,
                Perm.USERS_MANAGE,
                Perm.APIARIES_VIEW,
                Perm.APIARIES_CREATE,
                Perm.APIARIES_MANAGE,
                Perm.HIVES_VIEW,
                Perm.HIVES_CREATE,
                Perm.HIVES_MANAGE,
                Perm.INSPECTIONS_VIEW,
                Perm.INSPECTIONS_CREATE,
                Perm.INSPECTIONS_MANAGE,
                Perm.ORDERS_VIEW,
                Perm.ORDERS_CREATE,
                Perm.ORDERS_MANAGE
            ]
        },
        "worker": {
            "name": "Worker",
            "description": "Standard worker with full apiary and hive management",
            "permissions": [
                Perm.APIARIES_VIEW,
                Perm.APIARIES_CREATE,
                Perm.APIARIES_MANAGE,
                Perm.HIVES_VIEW,
                Perm.HIVES_CREATE,
                Perm.HIVES_MANAGE,
                Perm.INSPECTIONS_VIEW,
                Perm.INSPECTIONS_CREATE,
                Perm.INSPECTIONS_MANAGE,
                Perm.ORDERS_VIEW,
                Perm.ORDERS_CREATE
            ]
        },
        "user": {
            "name": "User",
            "description": "Basic user",
            "permissions": [
                Perm.ORDERS_VIEW,
                Perm.ORDERS_CREATE
            ]
        }
    }


def initialize_permissions(db: Session) -> None:
    print("🔑 Initializing permissions...")
    
    permission_definitions = get_permission_definitions()
    created_count = 0
    
    for category, perms in permission_definitions.items():
        for perm_name, description in perms.items():
            existing_perm = db.query(models.Permission).filter(
                models.Permission.name == perm_name
            ).first()
            
            if not existing_perm:
                permission = models.Permission(
                    name=perm_name,
                    description=description,
                    category=category
                )
                db.add(permission)
                created_count += 1
                print(f"  ✅ Created permission: {perm_name}")
            else:
                if existing_perm.description != description:
                    existing_perm.description = description
                    print(f"  🔄 Updated permission description: {perm_name}")
    
    db.commit()
    print(f"🔑 Permissions initialized: {created_count} created")
    log_event(f"RBAC permissions initialized: {created_count} created")


def initialize_roles(db: Session) -> None:
    print("👥 Initializing roles...")
    
    role_definitions = get_default_roles()
    created_count = 0
    
    for role_code, role_data in role_definitions.items():
        existing_role = db.query(models.Role).filter(
            models.Role.name == role_code
        ).first()
        
        if not existing_role:
            role = models.Role(
                name=role_code,
                description=role_data["description"],
                is_system=True
            )
            db.add(role)
            db.flush()
            created_count += 1
            print(f"  ✅ Created role: {role_code}")
        else:
            role = existing_role
            if role.description != role_data["description"]:
                role.description = role_data["description"]
            print(f"  🔄 Updated role: {role_code}")
        _setup_role_permissions(db, role, role_data["permissions"])
    
    db.commit()
    print(f"👥 Roles initialized: {created_count} created")
    log_event(f"RBAC roles initialized: {created_count} created")


def _setup_role_permissions(db: Session, role: models.Role, permission_names: List[str]) -> None:
    current_perms = db.query(models.RolePermission).filter(
        models.RolePermission.role_id == role.id
    ).all()
    current_perm_names = set()
    
    for rp in current_perms:
        perm = db.query(models.Permission).filter(
            models.Permission.id == rp.permission_id
        ).first()
        if perm:
            current_perm_names.add(perm.name)
    for perm_name in permission_names:
        if perm_name not in current_perm_names:
            permission = db.query(models.Permission).filter(
                models.Permission.name == perm_name
            ).first()
            
            if permission:
                role_perm = models.RolePermission(
                    role_id=role.id,
                    permission_id=permission.id
                )
                db.add(role_perm)
                print(f"    🔗 Added permission {perm_name} to role {role.name}")
    for perm_name in current_perm_names:
        if perm_name not in permission_names:
            permission = db.query(models.Permission).filter(
                models.Permission.name == perm_name
            ).first()
            
            if permission:
                role_perm = db.query(models.RolePermission).filter(
                    models.RolePermission.role_id == role.id,
                    models.RolePermission.permission_id == permission.id
                ).first()
                
                if role_perm:
                    db.delete(role_perm)
                    print(f"    🗑️ Removed permission {perm_name} from role {role.name}")


def assign_rbac_roles_to_users(db: Session) -> None:
    print(f"👑 Assigning RBAC roles to all users based on existing roles...")
    
    all_users = db.query(models.User).all()
    
    if not all_users:
        print(f"  ⚠️ No users found in the system")
        return
    
    rbac_roles = {role.name: role for role in db.query(models.Role).all()}
    
    if not rbac_roles:
        print("  ⚠️ No RBAC roles found, skipping assignment")
        return
    
    assignments_created = 0
    role_counts = {"admin": 0, "worker": 0, "user": 0}
    
    for user in all_users:
        user_role_name = user.role.value if user.role else "user"
        
        if user_role_name not in rbac_roles:
            print(f"  ⚠️ RBAC role '{user_role_name}' not found for user {user.email}")
            continue
            
        rbac_role = rbac_roles[user_role_name]
        
        existing_assignment = db.query(models.UserRoleAssignment).filter(
            models.UserRoleAssignment.user_id == user.id,
            models.UserRoleAssignment.role_id == rbac_role.id,
            models.UserRoleAssignment.is_active == True
        ).first()
        
        if not existing_assignment:
            assignment = models.UserRoleAssignment(
                user_id=user.id,
                role_id=rbac_role.id,
                assigned_by=user.id,
                assigned_at=datetime.now(timezone.utc),
                is_active=True
            )
            db.add(assignment)
            assignments_created += 1
            role_counts[user_role_name] += 1
            print(f"  ✅ Assigned {user_role_name} role to {user.email}")
        else:
            print(f"  🔄 {user_role_name} role already assigned to {user.email}")
    
    if assignments_created > 0:
        db.commit()
        print(f"  ✅ Created {assignments_created} RBAC role assignments:")
        for role_name, count in role_counts.items():
            if count > 0:
                print(f"    - {role_name}: {count} users")
        log_event(f"Assigned RBAC roles to {assignments_created} users: {role_counts}")
    else:
        print(f"  ℹ️ All users already have RBAC role assignments")


def initialize_rbac_system(db: Session) -> bool:
    try:
        print("🚀 Initializing RBAC system...")
        if not check_rbac_tables_exist():
            print("❌ RBAC tables do not exist. Please ensure tables are created first.")
            return False
        initialize_permissions(db)
        initialize_roles(db)
        assign_rbac_roles_to_users(db)
        
        print("✅ RBAC system initialization completed successfully!")
        log_event("RBAC system initialization completed")
        return True
        
    except Exception as e:
        print(f"❌ Error initializing RBAC system: {e}")
        log_event(f"Error initializing RBAC system: {str(e)}")
        db.rollback()
        return False


def verify_rbac_setup(db: Session) -> Dict:
    try:
        perm_count = db.query(models.Permission).count()
        role_count = db.query(models.Role).count()
        role_perm_count = db.query(models.RolePermission).count()
        user_role_count = db.query(models.UserRoleAssignment).filter(
            models.UserRoleAssignment.is_active == True
        ).count()
        admin_with_role = db.query(models.UserRoleAssignment).join(
            models.User, models.UserRoleAssignment.user_id == models.User.id
        ).join(
            models.Role, models.UserRoleAssignment.role_id == models.Role.id
        ).filter(
            models.User.email == "admin@beetrack.local",
            models.Role.name == "super_admin",
            models.UserRoleAssignment.is_active == True
        ).first()
        
        status = {
            "permissions_count": perm_count,
            "roles_count": role_count,
            "role_permissions_count": role_perm_count,
            "user_role_assignments_count": user_role_count,
            "admin_has_super_admin": admin_with_role is not None,
            "status": "OK" if perm_count > 0 and role_count > 0 else "INCOMPLETE"
        }
        
        return status
        
    except Exception as e:
        return {
            "status": "ERROR",
            "error": str(e)
        }