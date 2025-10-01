from fastapi.testclient import TestClient
from app import models
from app.services.rbac import Perm
from tests.conftest import _create_user, _ensure_permission


def test_create_hive_success(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.HIVES_CREATE)
    
    apiary = models.Apiary(
        name="Test Apiary",
        location="Test Location",
        owner_id=admin_user.id
    )
    db_session.add(apiary)
    db_session.commit()
    
    hive_data = {
        "name": "Test Hive",
        "status": "active",
        "apiary_id": apiary.id
    }
    
    response = client.post("/hives/", json=hive_data)
    assert response.status_code == 200
    
    hive = response.json()
    assert hive["name"] == "Test Hive"
    assert hive["status"] == "active"
    assert hive["apiary_id"] == apiary.id


def test_create_hive_missing_apiary(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.HIVES_CREATE)
    
    hive_data = {
        "name": "Test Hive",
        "status": "active"
    }
    
    response = client.post("/hives/", json=hive_data)
    assert response.status_code == 400
    assert "apiary_id is required" in response.json()["message"]


def test_create_hive_apiary_not_found(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.HIVES_CREATE)
    
    hive_data = {
        "name": "Test Hive",
        "status": "active",
        "apiary_id": 99999
    }
    
    response = client.post("/hives/", json=hive_data)
    assert response.status_code == 404
    assert "Apiary not found" in response.json()["message"]


def test_create_hive_duplicate_name(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.HIVES_CREATE)
    
    apiary = models.Apiary(
        name="Test Apiary",
        location="Test Location",
        owner_id=admin_user.id
    )
    db_session.add(apiary)
    db_session.flush()
    
    existing_hive = models.Hive(
        name="Existing Hive",
        status="active",
        apiary_id=apiary.id
    )
    db_session.add(existing_hive)
    db_session.commit()
    
    hive_data = {
        "name": "Existing Hive",
        "status": "active",
        "apiary_id": apiary.id
    }
    
    response = client.post("/hives/", json=hive_data)
    assert response.status_code == 400
    assert "already exists" in response.json()["message"]


def test_list_hives(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.HIVES_VIEW)
    
    apiary = models.Apiary(
        name="Test Apiary",
        location="Test Location",
        owner_id=admin_user.id
    )
    db_session.add(apiary)
    db_session.flush()
    
    hive1 = models.Hive(name="Hive 1", status="active", apiary_id=apiary.id)
    hive2 = models.Hive(name="Hive 2", status="inactive", apiary_id=apiary.id)
    db_session.add_all([hive1, hive2])
    db_session.commit()
    
    response = client.get("/hives/", params={"page": 1, "size": 10})
    assert response.status_code == 200
    
    data = response.json()
    assert "meta" in data
    assert "items" in data
    assert data["meta"]["total"] >= 2
    assert len(data["items"]) >= 2


def test_list_hives_with_search(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.HIVES_VIEW)
    
    apiary = models.Apiary(
        name="Searchable Apiary",
        location="Test Location",
        owner_id=admin_user.id
    )
    db_session.add(apiary)
    db_session.flush()
    
    hive1 = models.Hive(name="Alpha Hive", status="active", apiary_id=apiary.id)
    hive2 = models.Hive(name="Beta Hive", status="active", apiary_id=apiary.id)
    db_session.add_all([hive1, hive2])
    db_session.commit()
    
    response = client.get("/hives/", params={"page": 1, "size": 10, "q": "Alpha"})
    assert response.status_code == 200
    
    data = response.json()
    assert len(data["items"]) >= 1
    alpha_found = any(item["name"] == "Alpha Hive" for item in data["items"])
    assert alpha_found


def test_get_hive_by_id(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.HIVES_VIEW)
    
    apiary = models.Apiary(
        name="Test Apiary",
        location="Test Location",
        owner_id=admin_user.id
    )
    db_session.add(apiary)
    db_session.flush()
    
    hive = models.Hive(name="Test Hive", status="active", apiary_id=apiary.id)
    db_session.add(hive)
    db_session.commit()
    
    response = client.get(f"/hives/{hive.id}")
    assert response.status_code == 200
    
    hive_data = response.json()
    assert hive_data["name"] == "Test Hive"
    assert hive_data["status"] == "active"
    assert hive_data["apiary_id"] == apiary.id


def test_get_hive_not_found(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.HIVES_VIEW)
    
    response = client.get("/hives/99999")
    assert response.status_code == 404
    assert "Hive not found" in response.json()["message"]


def test_update_hive_success(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.HIVES_MANAGE)
    
    apiary = models.Apiary(
        name="Test Apiary",
        location="Test Location",
        owner_id=admin_user.id
    )
    db_session.add(apiary)
    db_session.flush()
    
    hive = models.Hive(name="Original Hive", status="active", apiary_id=apiary.id)
    db_session.add(hive)
    db_session.commit()
    
    update_data = {
        "name": "Updated Hive",
        "status": "inactive",
        "apiary_id": apiary.id
    }
    
    response = client.put(f"/hives/{hive.id}", json=update_data)
    assert response.status_code == 200
    
    updated_hive = response.json()
    assert updated_hive["name"] == "Updated Hive"
    assert updated_hive["status"] == "inactive"


def test_update_hive_not_found(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.HIVES_MANAGE)
    
    update_data = {
        "name": "Updated Hive",
        "status": "inactive"
    }
    
    response = client.put("/hives/99999", json=update_data)
    assert response.status_code == 404
    assert "Hive not found" in response.json()["message"]


def test_update_hive_duplicate_name(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.HIVES_MANAGE)
    
    apiary = models.Apiary(
        name="Test Apiary",
        location="Test Location",
        owner_id=admin_user.id
    )
    db_session.add(apiary)
    db_session.flush()
    
    hive1 = models.Hive(name="Hive One", status="active", apiary_id=apiary.id)
    hive2 = models.Hive(name="Hive Two", status="active", apiary_id=apiary.id)
    db_session.add_all([hive1, hive2])
    db_session.commit()
    
    update_data = {
        "name": "Hive One",
        "status": "active",
        "apiary_id": apiary.id
    }
    
    response = client.put(f"/hives/{hive2.id}", json=update_data)
    assert response.status_code == 400
    assert "already exists" in response.json()["message"]


def test_delete_hive_success(client: TestClient, db_session, admin_user):
    _ensure_permission(db_session, admin_user, Perm.HIVES_MANAGE)
    
    apiary = models.Apiary(
        name="Test Apiary",
        location="Test Location",
        owner_id=admin_user.id
    )
    db_session.add(apiary)
    db_session.flush()
    
    hive = models.Hive(name="Test Hive", status="active", apiary_id=apiary.id)
    db_session.add(hive)
    db_session.commit()
    
    response = client.delete(f"/hives/{hive.id}")
    assert response.status_code == 204
    
    deleted_hive = db_session.query(models.Hive).filter(models.Hive.id == hive.id).first()
    assert deleted_hive is None


def test_delete_hive_not_found(client: TestClient, db_session, admin_user):
    response = client.delete("/hives/99999")
    assert response.status_code == 404
    assert "Hive not found" in response.json()["message"]


def test_delete_hive_owner_permission(client: TestClient, db_session):
    regular_user = _create_user(db_session, "regular")
    
    apiary = models.Apiary(
        name="Owner Apiary",
        location="Test Location",
        owner_id=regular_user.id
    )
    db_session.add(apiary)
    db_session.flush()
    
    hive = models.Hive(name="Owner Hive", status="active", apiary_id=apiary.id)
    db_session.add(hive)
    db_session.commit()
    
    from app.main import app
    from app.services.auth import get_current_user
    
    def override_get_current_user():
        return regular_user
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    try:
        response = client.delete(f"/hives/{hive.id}")
        assert response.status_code == 204
        
    finally:
        app.dependency_overrides.pop(get_current_user, None)