from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.schemas import TokenData
from fastapi import Depends, HTTPException, status, Request, Cookie
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.hashing import Hasher
from app.utils.logger import log_event
import os
import secrets
import uuid

SECRET_KEY = os.getenv("SECRET_KEY", "secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login", auto_error=False)


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
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int, session_id: int = None, expires_delta: timedelta = None):
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    
    token_bytes = secrets.token_bytes(32)
    refresh_token = secrets.token_urlsafe(32)
    
    return refresh_token, expire


def create_user_session(db: Session, user_id: int, refresh_token: str, expires_at: datetime, 
                        user_agent: str = None, ip_address: str = None, device_info: str = None):
    user_session = models.UserSession(
        user_id=user_id,
        refresh_token=refresh_token,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
        device_info=device_info
    )
    db.add(user_session)
    db.commit()
    db.refresh(user_session)
    return user_session


def get_session_by_refresh_token(db: Session, refresh_token: str):
    return db.query(models.UserSession).filter(
        models.UserSession.refresh_token == refresh_token,
        models.UserSession.is_valid == True,
        models.UserSession.expires_at > datetime.now(timezone.utc)
    ).first()


def refresh_access_token(db: Session, refresh_token: str):
    session = get_session_by_refresh_token(db, refresh_token)
    if not session:
        return None
    
    session.last_activity = datetime.now(timezone.utc)
    db.commit()
    
    return create_access_token(data={"sub": session.user.username, "session_id": session.id})


def invalidate_session(db: Session, session_id: int):
    session = db.query(models.UserSession).filter(models.UserSession.id == session_id).first()
    if session:
        session.is_valid = False
        db.commit()
        return True
    return False


def invalidate_all_user_sessions(db: Session, user_id: int, except_session_id: int = None):
    query = db.query(models.UserSession).filter(
        models.UserSession.user_id == user_id,
        models.UserSession.is_valid == True
    )
    
    if except_session_id:
        query = query.filter(models.UserSession.id != except_session_id)
    
    sessions = query.all()
    for session in sessions:
        session.is_valid = False
    
    db.commit()
    return len(sessions)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db), 
                  refresh_token: str = Cookie(None, alias="refresh_token")) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token and refresh_token:
        new_token = refresh_access_token(db, refresh_token)
        if new_token:
            token = new_token
        else:
            raise credentials_exception
    
    if not token:
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        session_id: int = payload.get("session_id")
        
        if not username:
            log_event("Token validation failed: missing username in token")
            raise credentials_exception
            
        token_data = TokenData(username=username, session_id=session_id)
    except JWTError:
        log_event("Token validation failed: JWT decode error")
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if not user:
        log_event(f"Token validation failed: user {token_data.username} not found")
        raise credentials_exception
    
    if token_data.session_id:
        session = db.query(models.UserSession).filter(
            models.UserSession.id == token_data.session_id,
            models.UserSession.user_id == user.id,
            models.UserSession.is_valid == True
        ).first()
        
        if not session:
            log_event(f"Token validation failed: invalid session for user {token_data.username}")
            raise credentials_exception
        
        session.last_activity = datetime.now(timezone.utc)
        db.commit()
    
    return user


def check_for_suspicious_activity(db: Session, user_id: int, ip_address: str, user_agent: str) -> bool:
    recent_sessions = db.query(models.UserSession).filter(
        models.UserSession.user_id == user_id,
        models.UserSession.is_valid == True
    ).order_by(models.UserSession.created_at.desc()).limit(5).all()
    
    if not recent_sessions:
        return False
    
    known_ips = set(session.ip_address for session in recent_sessions if session.ip_address)
    known_agents = set(session.user_agent for session in recent_sessions if session.user_agent)
    
    return ip_address not in known_ips or user_agent not in known_agents


def requires_role(required_role: str):
    def decorator(current_user: models.User = Depends(get_current_user)):
        if current_user.role != required_role:
            log_event(f"Authorization failed: user {current_user.username} (role: {current_user.role}) requires role: {required_role}")
            raise HTTPException(status_code=403, detail="Insufficient privileges")
        return current_user
    return decorator
