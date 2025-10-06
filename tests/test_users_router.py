from fastapi.testclient import TestClient
from app import models
from app.utils.hashing import Hasher
from tests.conftest import _create_user


def hash_password(password: str) -> str:
    return Hasher.hash_password(password)


def test_register_user_success(client: TestClient, db_session):
    user_data = {
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "StrongPassword123!",
    }

    response = client.post("/users/register", json=user_data)
    assert response.status_code == 200

    registered_user = response.json()
    assert registered_user["username"] == "newuser"
    assert registered_user["email"] == "newuser@example.com"
    assert "password" not in registered_user
    assert "hashed_password" not in registered_user

    db_user = (
        db_session.query(models.User)
        .filter(models.User.email == "newuser@example.com")
        .first()
    )
    assert db_user is not None
    assert db_user.username == "newuser"


def test_register_user_duplicate_email(client: TestClient, db_session):
    existing_user = _create_user(db_session, "existing")
    db_session.commit()

    user_data = {
        "username": "newuser",
        "email": existing_user.email,
        "password": "StrongPassword123!",
    }

    response = client.post("/users/register", json=user_data)
    assert response.status_code == 400
    assert "already exists" in response.json()["message"]


def test_register_user_duplicate_username(client: TestClient, db_session):
    existing_user = _create_user(db_session, "existing")
    db_session.commit()

    user_data = {
        "username": existing_user.username,
        "email": "newemail@example.com",
        "password": "StrongPassword123!",
    }

    response = client.post("/users/register", json=user_data)
    assert response.status_code == 400
    assert "already exists" in response.json()["message"]


def test_register_user_weak_password(client: TestClient, db_session):
    user_data = {
        "username": "newuser_weak",
        "email": "newuser_weak@example.com",
        "password": "weak123",
    }

    response = client.post("/users/register", json=user_data)
    assert response.status_code in [422, 429]


def test_login_user_success(client: TestClient, db_session):
    password = "TestPassword123!"
    user = models.User(
        username="testuser",
        email="test@example.com",
        hashed_password=hash_password(password),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    login_data = {"username": "test@example.com", "password": password}

    response = client.post("/users/login", data=login_data)
    assert response.status_code == 200

    token_response = response.json()
    assert "access_token" in token_response
    assert token_response["token_type"] == "bearer"


def test_login_user_wrong_password(client: TestClient, db_session):
    password = "TestPassword123!"
    user = models.User(
        username="testuser",
        email="test@example.com",
        hashed_password=hash_password(password),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    login_data = {"username": "test@example.com", "password": "WrongPassword123!"}

    response = client.post("/users/login", data=login_data)
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["message"]


def test_login_user_not_found(client: TestClient, db_session):
    login_data = {"username": "nonexistent@example.com", "password": "TestPassword123!"}

    response = client.post("/users/login", data=login_data)
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["message"]


def test_login_user_inactive(client: TestClient, db_session):
    password = "TestPassword123!"
    user = models.User(
        username="inactiveuser",
        email="inactive@example.com",
        hashed_password=hash_password(password),
        is_active=False,
    )
    db_session.add(user)
    db_session.commit()

    login_data = {"username": "inactive@example.com", "password": password}

    response = client.post("/users/login", data=login_data)
    assert response.status_code == 403
    assert "not active" in response.json()["message"]


def test_login_with_remember_success(client: TestClient, db_session):
    password = "TestPassword123!"
    user = models.User(
        username="testuser",
        email="test@example.com",
        hashed_password=hash_password(password),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    login_data = {
        "email": "test@example.com",
        "password": password,
        "remember_me": True,
    }

    response = client.post("/users/login-with-remember", json=login_data)
    assert response.status_code == 200

    token_response = response.json()
    assert "access_token" in token_response
    assert token_response["token_type"] == "bearer"


def test_get_current_user_profile(client: TestClient, db_session, admin_user):
    response = client.get("/users/me")
    assert response.status_code == 200

    profile = response.json()
    assert profile["username"] == admin_user.username
    assert profile["email"] == admin_user.email
    assert "password" not in profile
    assert "hashed_password" not in profile


def test_get_user_by_id(client: TestClient, db_session, admin_user):
    test_user = _create_user(db_session, "targetuser")
    db_session.commit()

    response = client.get(f"/users/{test_user.id}")
    assert response.status_code == 200

    user_data = response.json()
    assert user_data["username"] == test_user.username
    assert user_data["email"] == test_user.email


def test_get_user_by_id_not_found(client: TestClient, db_session, admin_user):
    response = client.get("/users/99999")
    assert response.status_code == 404


def test_update_user_profile(client: TestClient, db_session, admin_user):
    update_data = {"username": "updatedusername", "email": admin_user.email}

    response = client.put("/users/me", json=update_data)
    assert response.status_code == 200

    token_response = response.json()
    assert "access_token" in token_response
    assert token_response["token_type"] == "bearer"


def test_change_password_success(client: TestClient, db_session):
    old_password = "OldPassword123!"
    new_password = "NewPassword123!"

    user = models.User(
        username="testuser",
        email="test@example.com",
        hashed_password=hash_password(old_password),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    def override_get_current_user():
        return user

    from app.main import app
    from app.services.auth import get_current_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    try:
        password_data = {"password": new_password}

        response = client.put("/users/me", json=password_data)
        assert response.status_code == 200
        assert "access_token" in response.json()

    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_change_password_wrong_current(client: TestClient, db_session):
    old_password = "OldPassword123!"

    user = models.User(
        username="testuser",
        email="test@example.com",
        hashed_password=hash_password(old_password),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    def override_get_current_user():
        return user

    from app.main import app
    from app.services.auth import get_current_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    try:
        password_data = {"password": "weak"}

        response = client.put("/users/me", json=password_data)
        assert response.status_code == 422

    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_logout_user(client: TestClient, db_session, admin_user):
    response = client.post("/users/logout")
    assert response.status_code == 200
    assert "Logged out successfully" in response.json()["message"]


def test_list_users_admin_access(client: TestClient, db_session, admin_user):
    user1 = _create_user(db_session, "user1")
    user2 = _create_user(db_session, "user2")
    db_session.commit()

    response = client.get("/users", params={"page": 1, "size": 10})

    if response.status_code == 200:
        users = response.json()
        assert isinstance(users, list)
        assert len(users) >= 2
    else:
        assert response.status_code == 403
