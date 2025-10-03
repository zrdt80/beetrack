import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app import models
from app.services.rbac import Perm
from tests.conftest import _create_user, _ensure_permission
from datetime import datetime, timezone


def create_test_apiary(db: Session, owner: models.User, name: str = "Test Apiary", location: str = "Test Location") -> models.Apiary:
    apiary = models.Apiary(
        name=name,
        location=location,
        description="Test apiary description",
        owner_id=owner.id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(apiary)
    db.flush()
    
    membership = models.ApiaryMember(
        apiary_id=apiary.id,
        user_id=owner.id,
        role=models.ApiaryRole.owner,
        is_active=True,
        joined_at=datetime.now(timezone.utc)
    )
    db.add(membership)
    db.commit()
    db.refresh(apiary)
    return apiary


def test_create_apiary_success(client: TestClient, db_session: Session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.APIARIES_CREATE)
    
    payload = {
        "name": "New Test Apiary",
        "location": "New Location",
        "description": "A new test apiary"
    }
    
    response = client.post("/apiaries/", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["location"] == payload["location"]
    assert data["description"] == payload["description"]
    assert data["owner_id"] == admin_user.id
    assert data["owner_username"] == admin_user.username
    
    apiary = db_session.query(models.Apiary).filter(models.Apiary.name == payload["name"]).first()
    assert apiary is not None
    assert apiary.owner_id == admin_user.id


def test_create_apiary_with_description(client: TestClient, db_session: Session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.APIARIES_CREATE)
    
    payload = {
        "name": "Test Apiary with Description",
        "location": "Test Location",
        "description": "This is a test apiary with a description"
    }
    
    response = client.post("/apiaries/", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["location"] == payload["location"]
    assert data["description"] == payload["description"]
    assert data["owner_username"] == admin_user.username


def test_create_apiary_insufficient_permissions(client: TestClient, db_session: Session, regular_user):
    payload = {
        "name": "Test Apiary",
        "location": "Test Location"
    }
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return regular_user
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.post("/apiaries/", json=payload)
    
    assert response.status_code == 403
    
    app.dependency_overrides.pop(get_current_user, None)


def test_list_apiaries_as_admin(client: TestClient, db_session: Session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.APIARIES_VIEW)
    _ensure_permission(db_session, admin_user, Perm.ADMIN_VIEW_OVERVIEW)
    
    owner1 = _create_user(db_session, "owner1")
    owner2 = _create_user(db_session, "owner2")
    
    apiary1 = create_test_apiary(db_session, owner1, "Apiary 1")
    apiary2 = create_test_apiary(db_session, owner2, "Apiary 2")
    
    response = client.get("/apiaries/")
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "meta" in data
    assert len(data["items"]) >= 2
    
    apiary_names = [item["name"] for item in data["items"]]
    assert "Apiary 1" in apiary_names
    assert "Apiary 2" in apiary_names


def test_list_apiaries_as_owner_only_sees_own_and_member(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    other_owner = _create_user(db_session, "other")
    
    _ensure_permission(db_session, owner, Perm.APIARIES_VIEW)
    
    owned_apiary = create_test_apiary(db_session, owner, "Owned Apiary")
    other_apiary = create_test_apiary(db_session, other_owner, "Other Apiary")
    
    membership = models.ApiaryMember(
        apiary_id=other_apiary.id,
        user_id=owner.id,
        role=models.ApiaryRole.worker,
        is_active=True
    )
    db_session.add(membership)
    db_session.commit()
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.get("/apiaries/")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    
    apiary_names = [item["name"] for item in data["items"]]
    assert "Owned Apiary" in apiary_names
    assert "Other Apiary" in apiary_names
    
    app.dependency_overrides.pop(get_current_user, None)


def test_list_apiaries_with_search(client: TestClient, db_session: Session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.APIARIES_VIEW)
    _ensure_permission(db_session, admin_user, Perm.ADMIN_VIEW_OVERVIEW)
    
    owner = _create_user(db_session, "owner")
    
    apiary1 = create_test_apiary(db_session, owner, "Honey Farm", "Mountain Valley")
    apiary2 = create_test_apiary(db_session, owner, "Bee Paradise", "City Center")
    
    response = client.get("/apiaries/?q=Honey")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["name"] == "Honey Farm"
    
    response = client.get("/apiaries/?q=Mountain")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["location"] == "Mountain Valley"


def test_get_apiary_success(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.get(f"/apiaries/{apiary.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == apiary.id
    assert data["name"] == apiary.name
    assert data["owner_id"] == owner.id
    assert data["owner_username"] == owner.username
    
    app.dependency_overrides.pop(get_current_user, None)


def test_get_apiary_not_found(client: TestClient, db_session: Session):
    response = client.get("/apiaries/99999")
    
    assert response.status_code == 404
    json_response = response.json()
    error_message = json_response.get("detail", json_response.get("message", ""))
    assert "Apiary not found" in error_message


def test_get_apiary_access_denied(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    other_user = _create_user(db_session, "other")
    
    apiary = create_test_apiary(db_session, owner, "Private Apiary")
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return other_user
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.get(f"/apiaries/{apiary.id}")
    
    assert response.status_code == 403
    assert "Not allowed" in response.json()["message"]
    
    app.dependency_overrides.pop(get_current_user, None)


def test_update_apiary_success(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "Original Name")
    
    payload = {
        "name": "Updated Name",
        "location": "Updated Location",
        "description": "Updated description"
    }
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.put(f"/apiaries/{apiary.id}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["location"] == payload["location"]
    assert data["description"] == payload["description"]
    
    app.dependency_overrides.pop(get_current_user, None)


def test_update_apiary_admin_access(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()
    
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "Original Name")
    
    payload = {
        "name": "Admin Updated",
        "location": "Admin Location"
    }
    
    response = client.put(f"/apiaries/{apiary.id}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == payload["name"]


def test_update_apiary_non_owner_denied(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    other_user = _create_user(db_session, "other")
    
    apiary = create_test_apiary(db_session, owner, "Original Name")
    
    payload = {"name": "Unauthorized Update"}
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return other_user
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.put(f"/apiaries/{apiary.id}", json=payload)
    
    assert response.status_code == 403
    
    app.dependency_overrides.pop(get_current_user, None)


def test_delete_apiary_success(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "To Delete")
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.delete(f"/apiaries/{apiary.id}")
    
    assert response.status_code == 204
    
    deleted_apiary = db_session.query(models.Apiary).filter(models.Apiary.id == apiary.id).first()
    assert deleted_apiary is None
    
    app.dependency_overrides.pop(get_current_user, None)


def test_delete_apiary_admin_access(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()
    
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "Admin Delete")
    
    response = client.delete(f"/apiaries/{apiary.id}")
    
    assert response.status_code == 204


def test_list_apiary_members(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    member = _create_user(db_session, "member")
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    membership = models.ApiaryMember(
        apiary_id=apiary.id,
        user_id=member.id,
        role=models.ApiaryRole.worker,
        is_active=True
    )
    db_session.add(membership)
    db_session.commit()
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.get(f"/apiaries/{apiary.id}/members")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    
    usernames = [item["username"] for item in data["items"]]
    assert owner.username in usernames
    assert member.username in usernames
    
    app.dependency_overrides.pop(get_current_user, None)


def test_list_members_with_search(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    member1 = _create_user(db_session, "john_worker")
    member2 = _create_user(db_session, "jane_manager")
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    for user, role in [(member1, models.ApiaryRole.worker), (member2, models.ApiaryRole.manager)]:
        membership = models.ApiaryMember(
            apiary_id=apiary.id,
            user_id=user.id,
            role=role,
            is_active=True
        )
        db_session.add(membership)
    db_session.commit()
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.get(f"/apiaries/{apiary.id}/members?q=john")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["username"] == member1.username
    
    app.dependency_overrides.pop(get_current_user, None)


def test_update_member_role_success(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    member = _create_user(db_session, "member")
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    membership = models.ApiaryMember(
        apiary_id=apiary.id,
        user_id=member.id,
        role=models.ApiaryRole.worker,
        is_active=True
    )
    db_session.add(membership)
    db_session.commit()
    
    payload = {"role": "manager"}
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.patch(f"/apiaries/{apiary.id}/members/{member.id}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "manager"
    
    app.dependency_overrides.pop(get_current_user, None)


def test_update_member_role_owner_cannot_change_own(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    payload = {"role": "worker"}
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.patch(f"/apiaries/{apiary.id}/members/{owner.id}", json=payload)
    
    assert response.status_code == 400
    assert "Owner role cannot be changed" in response.json()["message"]
    
    app.dependency_overrides.pop(get_current_user, None)


def test_remove_member_success(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    member = _create_user(db_session, "member")
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    membership = models.ApiaryMember(
        apiary_id=apiary.id,
        user_id=member.id,
        role=models.ApiaryRole.worker,
        is_active=True
    )
    db_session.add(membership)
    db_session.commit()
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.delete(f"/apiaries/{apiary.id}/members/{member.id}")
    
    assert response.status_code == 204
    
    updated_membership = db_session.query(models.ApiaryMember).filter(
        models.ApiaryMember.apiary_id == apiary.id,
        models.ApiaryMember.user_id == member.id
    ).first()
    assert updated_membership.is_active == False
    
    app.dependency_overrides.pop(get_current_user, None)


def test_remove_member_owner_cannot_remove_self(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.delete(f"/apiaries/{apiary.id}/members/{owner.id}")
    
    assert response.status_code == 400
    assert "Owner cannot remove themselves" in response.json()["message"]
    
    app.dependency_overrides.pop(get_current_user, None)


def test_invite_member_success(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    invitee = _create_user(db_session, "invitee")
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    payload = {
        "email": invitee.email,
        "role": "worker"
    }
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.post(f"/apiaries/{apiary.id}/invitations", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["invitee_email"] == invitee.email
    assert data["role"] == "worker"
    assert data["status"] == "pending"
    assert "token" in data
    
    app.dependency_overrides.pop(get_current_user, None)


def test_invite_member_nonexistent_user(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    payload = {
        "email": "nonexistent@example.com",
        "role": "worker"
    }
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.post(f"/apiaries/{apiary.id}/invitations", json=payload)
    
    assert response.status_code == 404
    assert "User not found or inactive" in response.json()["message"]
    
    app.dependency_overrides.pop(get_current_user, None)


def test_accept_invitation_success(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    invitee = _create_user(db_session, "invitee")
    invitee.role = models.UserRole.worker
    db_session.commit()
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    invitation = models.ApiaryInvitation(
        apiary_id=apiary.id,
        inviter_id=owner.id,
        invitee_email=invitee.email,
        role=models.ApiaryRole.worker,
        status=models.InvitationStatus.pending,
        token="test_token"
    )
    db_session.add(invitation)
    db_session.commit()
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return invitee
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.post(f"/apiaries/invitations/accept/test_token")
    
    assert response.status_code == 200
    data = response.json()
    assert data["apiary_id"] == apiary.id
    assert data["user_id"] == invitee.id
    assert data["role"] == "worker"
    assert data["is_active"] == True
    
    app.dependency_overrides.pop(get_current_user, None)


def test_accept_invitation_wrong_email(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    invitee = _create_user(db_session, "invitee")
    wrong_user = _create_user(db_session, "wrong")
    wrong_user.role = models.UserRole.worker
    db_session.commit()
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    invitation = models.ApiaryInvitation(
        apiary_id=apiary.id,
        inviter_id=owner.id,
        invitee_email=invitee.email,
        role=models.ApiaryRole.worker,
        status=models.InvitationStatus.pending,
        token="test_token"
    )
    db_session.add(invitation)
    db_session.commit()
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return wrong_user
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.post(f"/apiaries/invitations/accept/test_token")
    
    assert response.status_code == 403
    assert "Invitation is for a different email" in response.json()["message"]
    
    app.dependency_overrides.pop(get_current_user, None)


def test_list_apiary_hives(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    hive1 = models.Hive(name="Hive 1", status="active", apiary_id=apiary.id)
    hive2 = models.Hive(name="Hive 2", status="inactive", apiary_id=apiary.id)
    db_session.add_all([hive1, hive2])
    db_session.commit()
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.get(f"/apiaries/{apiary.id}/hives")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    
    hive_names = [item["name"] for item in data["items"]]
    assert "Hive 1" in hive_names
    assert "Hive 2" in hive_names
    
    app.dependency_overrides.pop(get_current_user, None)


def test_create_hive_in_apiary_success(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    payload = {
        "name": "New Hive",
        "status": "active"
    }
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.post(f"/apiaries/{apiary.id}/hives", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["status"] == payload["status"]
    assert data["apiary_id"] == apiary.id
    
    app.dependency_overrides.pop(get_current_user, None)


def test_create_hive_duplicate_name_in_apiary(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    existing_hive = models.Hive(name="Duplicate Name", status="active", apiary_id=apiary.id)
    db_session.add(existing_hive)
    db_session.commit()
    
    payload = {
        "name": "Duplicate Name",
        "status": "active"
    }
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.post(f"/apiaries/{apiary.id}/hives", json=payload)
    
    assert response.status_code == 400
    assert "Hive with this name already exists in this apiary" in response.json()["message"]
    
    app.dependency_overrides.pop(get_current_user, None)


def test_create_hive_manager_permission(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    manager = _create_user(db_session, "manager")
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    membership = models.ApiaryMember(
        apiary_id=apiary.id,
        user_id=manager.id,
        role=models.ApiaryRole.manager,
        is_active=True
    )
    db_session.add(membership)
    db_session.commit()
    
    payload = {
        "name": "Manager Hive",
        "status": "active"
    }
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return manager
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.post(f"/apiaries/{apiary.id}/hives", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == payload["name"]
    
    app.dependency_overrides.pop(get_current_user, None)


def test_create_hive_worker_permission_denied(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    worker = _create_user(db_session, "worker")
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    membership = models.ApiaryMember(
        apiary_id=apiary.id,
        user_id=worker.id,
        role=models.ApiaryRole.worker,
        is_active=True
    )
    db_session.add(membership)
    db_session.commit()
    
    payload = {
        "name": "Worker Hive",
        "status": "active"
    }
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return worker
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.post(f"/apiaries/{apiary.id}/hives", json=payload)
    
    assert response.status_code == 403
    assert "Only owner or manager can add hives" in response.json()["message"]
    
    app.dependency_overrides.pop(get_current_user, None)


def test_transfer_ownership_success(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()
    
    owner = _create_user(db_session, "owner")
    new_owner = _create_user(db_session, "new_owner")
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    payload = {
        "new_owner_user_id": new_owner.id
    }
    
    response = client.post(f"/apiaries/{apiary.id}/transfer-ownership", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["owner_id"] == new_owner.id
    assert data["owner_username"] == new_owner.username
    
    old_owner_membership = db_session.query(models.ApiaryMember).filter(
        models.ApiaryMember.apiary_id == apiary.id,
        models.ApiaryMember.user_id == owner.id
    ).first()
    assert old_owner_membership.role == models.ApiaryRole.manager
    
    new_owner_membership = db_session.query(models.ApiaryMember).filter(
        models.ApiaryMember.apiary_id == apiary.id,
        models.ApiaryMember.user_id == new_owner.id
    ).first()
    assert new_owner_membership.role == models.ApiaryRole.owner


def test_transfer_ownership_non_admin_denied(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    new_owner = _create_user(db_session, "new_owner")
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    payload = {
        "new_owner_user_id": new_owner.id
    }
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.post(f"/apiaries/{apiary.id}/transfer-ownership", json=payload)
    
    assert response.status_code == 403
    assert "Only admin can transfer ownership" in response.json()["message"]
    
    app.dependency_overrides.pop(get_current_user, None)


def test_transfer_ownership_same_owner(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()
    
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    payload = {
        "new_owner_user_id": owner.id
    }
    
    response = client.post(f"/apiaries/{apiary.id}/transfer-ownership", json=payload)
    
    assert response.status_code == 400
    assert "New owner is already the owner" in response.json()["message"]


def test_add_member_direct_admin_success(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()
    
    owner = _create_user(db_session, "owner")
    new_member = _create_user(db_session, "new_member")
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    payload = {
        "user_id": new_member.id,
        "role": "manager"
    }
    
    response = client.post(f"/apiaries/{apiary.id}/members", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == new_member.id
    assert data["role"] == "manager"
    assert data["is_active"] == True


def test_add_member_direct_non_admin_denied(client: TestClient, db_session: Session):
    owner = _create_user(db_session, "owner")
    new_member = _create_user(db_session, "new_member")
    
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    payload = {
        "user_id": new_member.id,
        "role": "worker"
    }
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return owner
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    response = client.post(f"/apiaries/{apiary.id}/members", json=payload)
    
    assert response.status_code == 403
    assert "Only admin can add members directly" in response.json()["message"]
    
    app.dependency_overrides.pop(get_current_user, None)


def test_add_member_direct_owner_already_member(client: TestClient, db_session: Session, admin_user):
    admin_user.role = models.UserRole.admin
    db_session.commit()
    
    owner = _create_user(db_session, "owner")
    apiary = create_test_apiary(db_session, owner, "Test Apiary")
    
    payload = {
        "user_id": owner.id,
        "role": "worker"
    }
    
    response = client.post(f"/apiaries/{apiary.id}/members", json=payload)
    
    assert response.status_code == 400
    assert "Owner is already part of the apiary" in response.json()["message"]