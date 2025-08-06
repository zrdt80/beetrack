from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.schemas import TokenData
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.utils.hashing import Hasher
from app.utils.logger import log_event
import os

SECRET_KEY = os.getenv("SECRET_KEY", "secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")


def authenticate_user(db: Session, username: str, password: str):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        log_event(f"Authentication failed: user {username} not found")
        return None
    if not Hasher.verify_password(password, user.hashed_password):
        log_event(f"Authentication failed: incorrect password for user {username}")
        return None
    log_event(f"Authentication successful: user {username}")
    return user


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            log_event("Token validation failed: missing username in token")
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        log_event("Token validation failed: JWT decode error")
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if not user:
        log_event(f"Token validation failed: user {token_data.username} not found")
        raise credentials_exception
    return user


def requires_role(required_role: str):
    def decorator(current_user: models.User = Depends(get_current_user)):
        if current_user.role != required_role:
            log_event(f"Authorization failed: user {current_user.username} (role: {current_user.role}) requires role: {required_role}")
            raise HTTPException(status_code=403, detail="Insufficient privileges")
        return current_user
    return decorator
