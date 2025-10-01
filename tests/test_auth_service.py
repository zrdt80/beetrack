import pytest
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from jose import JWTError, jwt
from app import models
from app.services.auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_user,
    ALGORITHM
)
from app.utils.hashing import Hasher
from app.config import settings
from tests.conftest import _create_user


class AuthenticationError(Exception):
    pass


class TokenError(Exception):
    pass


def hash_password(password: str) -> str:
    return Hasher.hash_password(password)


def verify_password(plain: str, hashed: str) -> bool:
    return Hasher.verify_password(plain, hashed)


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        raise TokenError("Invalid token")


def test_hash_password():
    password = "test_password_123"
    hashed = hash_password(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_authenticate_user_success(db_session):
    password = "test_password_123"
    hashed_password = hash_password(password)
    
    user = models.User(
        username="testuser",
        email="test@example.com",
        hashed_password=hashed_password,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    
    authenticated_user = authenticate_user(db_session, "test@example.com", password)
    assert authenticated_user is not None
    assert authenticated_user.username == "testuser"
    assert authenticated_user.email == "test@example.com"


def test_authenticate_user_wrong_password(db_session):
    password = "test_password_123"
    hashed_password = hash_password(password)
    
    user = models.User(
        username="testuser",
        email="test@example.com",
        hashed_password=hashed_password,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    
    result = authenticate_user(db_session, "test@example.com", "wrong_password")
    assert result is None


def test_authenticate_user_not_found(db_session):
    result = authenticate_user(db_session, "nonexistent@example.com", "password")
    assert result is None


def test_authenticate_user_inactive(db_session):
    password = "test_password_123"
    hashed_password = hash_password(password)
    
    user = models.User(
        username="inactiveuser",
        email="inactive@example.com",
        hashed_password=hashed_password,
        is_active=False
    )
    db_session.add(user)
    db_session.commit()
    
    result = authenticate_user(db_session, "inactive@example.com", password)
    assert result is None or result.is_active is False


def test_create_access_token():
    data = {"sub": "user123", "role": "admin"}
    token = create_access_token(data)
    
    assert isinstance(token, str)
    assert len(token) > 0
    
    payload = verify_token(token)
    assert payload["sub"] == "user123"
    assert payload["role"] == "admin"
    assert "exp" in payload


def test_create_refresh_token():
    user_id = 123
    token, expires_at = create_refresh_token(user_id)
    
    assert isinstance(token, str)
    assert len(token) > 0
    assert isinstance(expires_at, datetime)
    assert expires_at > datetime.now(timezone.utc)


def test_verify_token_invalid():
    with pytest.raises(TokenError):
        verify_token("invalid_token")


def test_verify_token_expired():
    data = {"sub": "user123", "exp": datetime.now(timezone.utc) - timedelta(seconds=1)}
    
    from jose import jwt
    from app.config import settings
    
    expired_token = jwt.encode(data, settings.secret_key, algorithm="HS256")
    
    with pytest.raises(TokenError):
        verify_token(expired_token)


def test_get_current_user_success(db_session):
    user = _create_user(db_session, "testuser")
    
    token_data = {"sub": user.email}
    token = create_access_token(token_data)
    
    current_user = get_current_user(token=token, db=db_session)
    assert current_user.id == user.id
    assert current_user.username == user.username


def test_get_current_user_invalid_token(db_session):
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token="invalid_token", db=db_session)
    
    assert exc_info.value.status_code == 401


def test_get_current_user_user_not_found(db_session):
    token_data = {"sub": "nonexistent@example.com"}
    token = create_access_token(token_data)
    
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(token=token, db=db_session)
    
    assert exc_info.value.status_code == 401


def test_get_current_user_inactive_user(db_session):
    user = models.User(
        username="inactiveuser",
        email="inactive@example.com",
        hashed_password="hashed",
        is_active=False
    )
    db_session.add(user)
    db_session.commit()
    
    token_data = {"sub": user.email}
    token = create_access_token(token_data)
    
    current_user = get_current_user(token=token, db=db_session)
    assert current_user.is_active is False