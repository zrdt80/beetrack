import os
import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "sqlite:///./test.db")
os.environ["SECRET_KEY"] = os.environ.get(
    "TEST_SECRET_KEY", "ZZ1xeW9URjQX2CGN8vBvkXJMc64UL9JoxF9K9xxjwJcMmUVT6a3LQpU87T0mLNyB"
)
os.environ["ENABLE_SCHEDULER"] = "false"
os.environ["METRICS_ENABLED"] = "false"
os.environ["DETAILED_LOGGING_ENABLED"] = "false"
os.environ["CORRELATION_IDS_ENABLED"] = "false"

from app import models
from app.database import Base, get_db
from app.main import app
from app.services.auth import get_current_user
from app.services.rbac import Perm

DATABASE_URL = os.environ["DATABASE_URL"]
CONNECT_ARGS = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=CONNECT_ARGS)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if DATABASE_URL.startswith("sqlite"):
        db_path = DATABASE_URL.replace("sqlite:///", "")
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except PermissionError:
                pass


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session, admin_user):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_current_user():
        return admin_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)


def _create_user(session, prefix: str = "user") -> models.User:
    suffix = uuid.uuid4().hex[:8]
    user = models.User(
        username=f"{prefix}_{suffix}",
        email=f"{prefix}_{suffix}@example.com",
        hashed_password="hashed",
        is_active=True,
    )
    session.add(user)
    session.flush()
    return user


def _ensure_permission(session, user: models.User, permission_name: str) -> None:
    permission = (
        session.query(models.Permission)
        .filter(models.Permission.name == permission_name)
        .first()
    )
    if not permission:
        permission = models.Permission(
            name=permission_name,
            description=permission_name,
            category="admin",
        )
        session.add(permission)
        session.flush()

    role = (
        session.query(models.Role)
        .filter(models.Role.name == "test_admin_role")
        .first()
    )
    if not role:
        role = models.Role(
            name="test_admin_role",
            description="Test Admin Role",
            is_system=True,
        )
        session.add(role)
        session.flush()

    if (
        session.query(models.RolePermission)
        .filter(
            models.RolePermission.role_id == role.id,
            models.RolePermission.permission_id == permission.id,
        )
        .first()
        is None
    ):
        session.add(
            models.RolePermission(role_id=role.id, permission_id=permission.id)
        )
        session.flush()

    if (
        session.query(models.UserRoleAssignment)
        .filter(
            models.UserRoleAssignment.user_id == user.id,
            models.UserRoleAssignment.role_id == role.id,
            models.UserRoleAssignment.is_active == True,
        )
        .first()
        is None
    ):
        session.add(
            models.UserRoleAssignment(
                user_id=user.id,
                role_id=role.id,
                assigned_by=user.id,
                assigned_at=datetime.now(timezone.utc),
                is_active=True,
            )
        )
        session.flush()


@pytest.fixture
def admin_user(db_session):
    user = _create_user(db_session, prefix="admin")
    _ensure_permission(db_session, user, Perm.ADMIN_VIEW_AUDIT)
    return user


@pytest.fixture
def regular_user(db_session):
    return _create_user(db_session, prefix="member")
