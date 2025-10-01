import pytest
from fastapi import HTTPException
from app import models
from app.services.rbac import (
    get_user_permissions,
    requires_permission,
    check_permission,
    list_user_permissions,
    Perm
)
from datetime import datetime, timezone
from tests.conftest import _create_user


def test_get_user_permissions_empty(db_session):
    user = _create_user(db_session)
    
    permissions = get_user_permissions(user, db_session)
    assert len(permissions) == 0


def test_get_user_permissions_with_roles(db_session):
    user = _create_user(db_session, "testuser")
    
    permission = models.Permission(
        name="test.permission",
        description="Test Permission",
        category="test"
    )
    db_session.add(permission)
    db_session.flush()
    
    role = models.Role(
        name="TestRole",
        description="Test Role",
        is_system=False
    )
    db_session.add(role)
    db_session.flush()
    
    role_permission = models.RolePermission(
        role_id=role.id,
        permission_id=permission.id
    )
    db_session.add(role_permission)
    
    user_role = models.UserRoleAssignment(
        user_id=user.id,
        role_id=role.id,
        assigned_by=user.id,
        assigned_at=datetime.now(timezone.utc),
        is_active=True
    )
    db_session.add(user_role)
    db_session.commit()
    
    permissions = get_user_permissions(user, db_session)
    assert "test.permission" in permissions
    assert len(permissions) == 1


def test_get_user_permissions_inactive_assignment(db_session):
    user = _create_user(db_session, "testuser")
    
    permission = models.Permission(
        name="test.permission",
        description="Test Permission",
        category="test"
    )
    db_session.add(permission)
    db_session.flush()
    
    role = models.Role(
        name="TestRole",
        description="Test Role",
        is_system=False
    )
    db_session.add(role)
    db_session.flush()
    
    role_permission = models.RolePermission(
        role_id=role.id,
        permission_id=permission.id
    )
    db_session.add(role_permission)
    
    user_role = models.UserRoleAssignment(
        user_id=user.id,
        role_id=role.id,
        assigned_by=user.id,
        assigned_at=datetime.now(timezone.utc),
        is_active=False
    )
    db_session.add(user_role)
    db_session.commit()
    
    permissions = get_user_permissions(user, db_session)
    assert len(permissions) == 0


def test_get_user_permissions_multiple_roles(db_session):
    user = _create_user(db_session, "testuser")
    
    perm1 = models.Permission(name="test.perm1", description="Test Permission 1", category="test")
    perm2 = models.Permission(name="test.perm2", description="Test Permission 2", category="test")
    db_session.add_all([perm1, perm2])
    db_session.flush()
    
    role1 = models.Role(name="Role1", description="Role 1", is_system=False)
    role2 = models.Role(name="Role2", description="Role 2", is_system=False)
    db_session.add_all([role1, role2])
    db_session.flush()
    
    role1_perm = models.RolePermission(role_id=role1.id, permission_id=perm1.id)
    role2_perm = models.RolePermission(role_id=role2.id, permission_id=perm2.id)
    db_session.add_all([role1_perm, role2_perm])
    
    user_role1 = models.UserRoleAssignment(
        user_id=user.id, role_id=role1.id, assigned_by=user.id,
        assigned_at=datetime.now(timezone.utc), is_active=True
    )
    user_role2 = models.UserRoleAssignment(
        user_id=user.id, role_id=role2.id, assigned_by=user.id,
        assigned_at=datetime.now(timezone.utc), is_active=True
    )
    db_session.add_all([user_role1, user_role2])
    db_session.commit()
    
    permissions = get_user_permissions(user, db_session)
    assert "test.perm1" in permissions
    assert "test.perm2" in permissions
    assert len(permissions) == 2


def test_check_permission_true(db_session):
    user = _create_user(db_session, "testuser")
    
    permission = models.Permission(name="test.permission", description="Test", category="test")
    db_session.add(permission)
    db_session.flush()
    
    role = models.Role(name="TestRole", description="Test Role", is_system=False)
    db_session.add(role)
    db_session.flush()
    
    role_permission = models.RolePermission(role_id=role.id, permission_id=permission.id)
    db_session.add(role_permission)
    
    user_role = models.UserRoleAssignment(
        user_id=user.id, role_id=role.id, assigned_by=user.id,
        assigned_at=datetime.now(timezone.utc), is_active=True
    )
    db_session.add(user_role)
    db_session.commit()
    
    assert check_permission(user, "test.permission", db_session) is True


def test_check_permission_false(db_session):
    user = _create_user(db_session, "testuser")
    
    assert check_permission(user, "nonexistent.permission", db_session) is False


def test_list_user_permissions(db_session):
    user = _create_user(db_session, "testuser")
    
    perm1 = models.Permission(name="test.perm1", description="Test 1", category="test")
    perm2 = models.Permission(name="test.perm2", description="Test 2", category="test")
    db_session.add_all([perm1, perm2])
    db_session.flush()
    
    role = models.Role(name="TestRole", description="Test Role", is_system=False)
    db_session.add(role)
    db_session.flush()
    
    role_perm1 = models.RolePermission(role_id=role.id, permission_id=perm1.id)
    role_perm2 = models.RolePermission(role_id=role.id, permission_id=perm2.id)
    db_session.add_all([role_perm1, role_perm2])
    
    user_role = models.UserRoleAssignment(
        user_id=user.id, role_id=role.id, assigned_by=user.id,
        assigned_at=datetime.now(timezone.utc), is_active=True
    )
    db_session.add(user_role)
    db_session.commit()
    
    permissions_list = list_user_permissions(user, db_session)
    assert isinstance(permissions_list, list)
    assert "test.perm1" in permissions_list
    assert "test.perm2" in permissions_list
    assert len(permissions_list) == 2


def test_requires_permission_decorator_success(db_session):
    user = _create_user(db_session, "testuser")
    
    permission = models.Permission(name=Perm.USERS_VIEW, description="View Users", category="users")
    db_session.add(permission)
    db_session.flush()
    
    role = models.Role(name="ViewerRole", description="Viewer Role", is_system=False)
    db_session.add(role)
    db_session.flush()
    
    role_permission = models.RolePermission(role_id=role.id, permission_id=permission.id)
    db_session.add(role_permission)
    
    user_role = models.UserRoleAssignment(
        user_id=user.id, role_id=role.id, assigned_by=user.id,
        assigned_at=datetime.now(timezone.utc), is_active=True
    )
    db_session.add(user_role)
    db_session.commit()
    
    permission_checker = requires_permission(Perm.USERS_VIEW)
    result = permission_checker(current_user=user, db=db_session)
    assert result == user


def test_requires_permission_decorator_failure(db_session):
    user = _create_user(db_session, "testuser")
    
    permission_checker = requires_permission(Perm.ADMIN_MANAGE_ROLES)
    
    with pytest.raises(HTTPException) as exc_info:
        permission_checker(current_user=user, db=db_session)
    
    assert exc_info.value.status_code == 403
    assert "INSUFFICIENT_PERMISSIONS" in str(exc_info.value.detail)


def test_permission_constants():
    assert hasattr(Perm, 'ADMIN_VIEW_OVERVIEW')
    assert hasattr(Perm, 'ADMIN_MANAGE_ROLES')
    assert hasattr(Perm, 'USERS_VIEW')
    assert hasattr(Perm, 'HIVES_CREATE')
    assert hasattr(Perm, 'INSPECTIONS_MANAGE')
    
    assert isinstance(Perm.ADMIN_VIEW_OVERVIEW, str)
    assert isinstance(Perm.USERS_VIEW, str)
    
    assert Perm.ADMIN_VIEW_OVERVIEW == "admin.view_overview"
    assert Perm.USERS_VIEW == "users.view"