from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app import models
from app.services.rbac import Perm
from tests.conftest import _create_user, _ensure_permission


def test_create_role(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    perm = models.Permission(
        name="inspections.view", 
        description="View inspections", 
        category="inspections"
    )
    db_session.add(perm)
    db_session.commit()
    
    role_data = {
        "name": "Inspector",
        "description": "Can view inspections",
        "is_system": False,
        "permissions": [perm.id],
    }
    
    response = client.post("/admin/rbac/roles", json=role_data)
    assert response.status_code == 200
    
    role = response.json()
    assert role["name"] == "Inspector"
    assert role["description"] == "Can view inspections"
    assert role["is_system"] is False
    assert len(role["permissions"]) == 1
    assert role["permissions"][0]["name"] == "inspections.view"


def test_create_role_duplicate_name(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    existing_role = models.Role(name="ExistingRole", description="Test role")
    db_session.add(existing_role)
    db_session.commit()
    
    role_data = {
        "name": "ExistingRole",
        "description": "Duplicate role",
        "is_system": False,
        "permissions": [],
    }
    
    response = client.post("/admin/rbac/roles", json=role_data)
    assert response.status_code == 400
    assert "already exists" in response.json()["message"]


def test_get_role(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    role = models.Role(name="TestRole", description="Test role", is_system=False)
    db_session.add(role)
    db_session.commit()
    
    response = client.get(f"/admin/rbac/roles/{role.id}")
    assert response.status_code == 200
    
    role_data = response.json()
    assert role_data["name"] == "TestRole"
    assert role_data["description"] == "Test role"
    assert role_data["is_system"] is False


def test_get_role_not_found(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    response = client.get("/admin/rbac/roles/99999")
    assert response.status_code == 404


def test_update_role(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    role = models.Role(name="UpdateRole", description="Original description", is_system=False)
    db_session.add(role)
    db_session.commit()
    
    update_data = {
        "description": "Updated description"
    }
    
    response = client.put(f"/admin/rbac/roles/{role.id}", json=update_data)
    assert response.status_code == 200
    
    updated_role = response.json()
    assert updated_role["description"] == "Updated description"


def test_update_system_role_permissions_forbidden(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    role = models.Role(name="SystemRole", description="System role", is_system=True)
    db_session.add(role)
    db_session.commit()
    
    update_data = {
        "permissions": []
    }
    
    response = client.put(f"/admin/rbac/roles/{role.id}", json=update_data)
    assert response.status_code == 400
    assert "system roles" in response.json()["message"]


def test_delete_role(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    role = models.Role(name="DeleteRole", description="To be deleted", is_system=False)
    db_session.add(role)
    db_session.commit()
    
    response = client.delete(f"/admin/rbac/roles/{role.id}")
    assert response.status_code == 200
    assert "deleted successfully" in response.json()["message"]


def test_delete_system_role_forbidden(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    role = models.Role(name="SystemRole", description="System role", is_system=True)
    db_session.add(role)
    db_session.commit()
    
    response = client.delete(f"/admin/rbac/roles/{role.id}")
    assert response.status_code == 400
    assert "system roles" in response.json()["message"]


def test_delete_role_with_active_assignments(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    role = models.Role(name="ActiveRole", description="Has assignments", is_system=False)
    db_session.add(role)
    db_session.flush()
    
    user = _create_user(db_session)
    assignment = models.UserRoleAssignment(
        user_id=user.id,
        role_id=role.id,
        assigned_by=admin_user.id,
        assigned_at=datetime.now(timezone.utc),
        is_active=True
    )
    db_session.add(assignment)
    db_session.commit()
    
    response = client.delete(f"/admin/rbac/roles/{role.id}")
    assert response.status_code == 400
    assert "active user assignments" in response.json()["message"]


def test_assign_role_to_user(client: TestClient, db_session, admin_user, regular_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    role = models.Role(name="AssignRole", description="For assignment", is_system=False)
    db_session.add(role)
    db_session.commit()
    
    response = client.post(f"/admin/rbac/users/{regular_user.id}/roles/{role.id}")
    assert response.status_code == 200
    assert "assigned" in response.json()["message"]
    
    assignment = db_session.query(models.UserRoleAssignment).filter(
        models.UserRoleAssignment.user_id == regular_user.id,
        models.UserRoleAssignment.role_id == role.id,
        models.UserRoleAssignment.is_active == True
    ).first()
    assert assignment is not None


def test_assign_role_duplicate_assignment(client: TestClient, db_session, admin_user, regular_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    role = models.Role(name="DupeRole", description="For duplication test", is_system=False)
    db_session.add(role)
    db_session.flush()
    
    assignment = models.UserRoleAssignment(
        user_id=regular_user.id,
        role_id=role.id,
        assigned_by=admin_user.id,
        assigned_at=datetime.now(timezone.utc),
        is_active=True
    )
    db_session.add(assignment)
    db_session.commit()
    
    response = client.post(f"/admin/rbac/users/{regular_user.id}/roles/{role.id}")
    assert response.status_code == 400
    assert "already has this role" in response.json()["message"]


def test_remove_role_from_user(client: TestClient, db_session, admin_user, regular_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    role = models.Role(name="RemoveRole", description="For removal", is_system=False)
    db_session.add(role)
    db_session.flush()
    
    assignment = models.UserRoleAssignment(
        user_id=regular_user.id,
        role_id=role.id,
        assigned_by=admin_user.id,
        assigned_at=datetime.now(timezone.utc),
        is_active=True
    )
    db_session.add(assignment)
    db_session.commit()
    
    response = client.delete(f"/admin/rbac/users/{regular_user.id}/roles/{role.id}")
    assert response.status_code == 200
    assert "removed" in response.json()["message"]
    
    updated_assignment = db_session.query(models.UserRoleAssignment).filter(
        models.UserRoleAssignment.user_id == regular_user.id,
        models.UserRoleAssignment.role_id == role.id
    ).first()
    assert updated_assignment.is_active is False


def test_assign_remove_role_and_changes_listing(client: TestClient, db_session, admin_user, regular_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    _ensure_permission(db_session, admin_user, Perm.ADMIN_VIEW_AUDIT)
    db_session.commit()
    
    perm = models.Permission(
        name="inspections.view", 
        description="View inspections", 
        category="inspections"
    )
    db_session.add(perm)
    db_session.commit()
    
    create_role = client.post(
        "/admin/rbac/roles",
        json={
            "name": "Inspector",
            "description": "Can view inspections",
            "is_system": False,
            "permissions": [perm.id],
        },
    )
    assert create_role.status_code == 200
    role_id = create_role.json()["id"]
    
    assign_response = client.post(f"/admin/rbac/users/{regular_user.id}/roles/{role_id}")
    assert assign_response.status_code == 200
    assert "assigned" in assign_response.json()["message"]
    
    assignment = db_session.query(models.UserRoleAssignment).filter(
        models.UserRoleAssignment.user_id == regular_user.id,
        models.UserRoleAssignment.role_id == role_id,
        models.UserRoleAssignment.is_active == True
    ).first()
    assert assignment is not None
    
    remove_response = client.delete(f"/admin/rbac/users/{regular_user.id}/roles/{role_id}")
    assert remove_response.status_code == 200
    assert "removed" in remove_response.json()["message"]
    
    db_session.refresh(assignment)
    assert assignment.is_active is False
    
    changes_response = client.get("/admin/rbac/changes", params={"page": 1, "size": 10})
    assert changes_response.status_code == 200


def test_list_users_with_roles(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_ROLES)
    
    user1 = _create_user(db_session, "testuser1")
    user2 = _create_user(db_session, "testuser2")
    
    role1 = models.Role(name="Role1", description="Test role 1", is_system=False)
    role2 = models.Role(name="Role2", description="Test role 2", is_system=False)
    db_session.add_all([role1, role2])
    db_session.flush()
    
    assignment1 = models.UserRoleAssignment(
        user_id=user1.id, role_id=role1.id, assigned_by=admin_user.id,
        assigned_at=datetime.now(timezone.utc), is_active=True
    )
    assignment2 = models.UserRoleAssignment(
        user_id=user2.id, role_id=role2.id, assigned_by=admin_user.id,
        assigned_at=datetime.now(timezone.utc), is_active=True
    )
    db_session.add_all([assignment1, assignment2])
    db_session.commit()
    
    response = client.get("/admin/rbac/users", params={"page": 1, "size": 10})
    assert response.status_code == 200
    
    users = response.json()
    assert len(users) >= 2
    
    user1_data = next((u for u in users if u["username"].startswith("testuser1")), None)
    user2_data = next((u for u in users if u["username"].startswith("testuser2")), None)
    
    assert user1_data is not None
    assert user2_data is not None
    assert len(user1_data["roles"]) >= 1
    assert len(user2_data["roles"]) >= 1


def test_list_permissions(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_PERMISSIONS)
    
    response = client.get("/admin/rbac/permissions")
    assert response.status_code == 200
    
    permissions = response.json()
    assert isinstance(permissions, list)


def test_list_permission_categories(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_MANAGE_PERMISSIONS)
    
    response = client.get("/admin/rbac/permissions/categories")
    assert response.status_code == 200
    
    categories = response.json()
    assert "categories" in categories
    assert isinstance(categories["categories"], list)


def test_rbac_overview(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.ADMIN_VIEW_OVERVIEW)
    
    response = client.get("/admin/rbac/overview")
    assert response.status_code == 200
    
    overview = response.json()
    assert "permissions_count" in overview
    assert "roles_count" in overview
    assert "user_stats" in overview
    assert overview["permissions_count"] >= 0
    assert overview["roles_count"] >= 0