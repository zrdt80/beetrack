from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.schemas import TokenData
from fastapi import Depends, HTTPException, status, Cookie
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.utils.hashing import Hasher
from app.utils.logger import log_event
from app.config import settings
import secrets
from typing import Optional, Tuple
from passlib.context import CryptContext

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_expire_days
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login", auto_error=False)


def get_token_data(email: str, token: Optional[str] = None) -> Optional[TokenData]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        email_from_token: str = payload.get("sub")
        if email_from_token != email:
            return None
        session_id: int = payload.get("session_id")
        db = next(get_db())
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            return None
        return TokenData(username=user.username, email=user.email, session_id=session_id)
    except JWTError:
        return None


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        log_event(f"Authentication failed: user with email {email} not found")
        return None
    if not Hasher.verify_password(password, user.hashed_password):
        log_event(f"Authentication failed: incorrect password for email {email}")
        return None
    log_event(f"Authentication successful: user {user.username}")
    return user


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(user_id: int, session_id: int = None, expires_delta: timedelta = None) -> Tuple[str, datetime]:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    refresh_token = secrets.token_urlsafe(48)
    return refresh_token, expire


def create_user_session(db: Session, user_id: int, refresh_token: str, expires_at: datetime,
                        user_agent: str = None, ip_address: str = None, device_info: str = None):
    hashed = pwd_context.hash(refresh_token)
    user_session = models.UserSession(
        user_id=user_id,
        refresh_token=None,
        hashed_refresh_token=hashed,
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
    candidates = db.query(models.UserSession).filter(
        models.UserSession.is_valid == True,
        models.UserSession.expires_at > datetime.now(timezone.utc)
    ).all()
    for s in candidates:
        if s.hashed_refresh_token and pwd_context.verify(refresh_token, s.hashed_refresh_token):
            return s
    return None


def rotate_refresh_token(
    db: Session,
    refresh_token: str,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
    device_info: Optional[str] = None,
) -> Optional[Tuple[str, str, models.UserSession]]:
    session = get_session_by_refresh_token(db, refresh_token)

    if not session:
        return None

    now_utc = datetime.now(timezone.utc)
    expires_at_utc = session.expires_at
    if expires_at_utc.tzinfo is None:
        expires_at_utc = expires_at_utc.replace(tzinfo=timezone.utc)

    if not session.is_valid or expires_at_utc <= now_utc:
        return None

    if session.replaced_by is not None:
        log_event(f"Refresh token reuse detected for user_id={session.user_id}; revoking all sessions")
        invalidate_all_user_sessions(db, session.user_id)
        return None

    user = session.user

    new_refresh, new_exp = create_refresh_token(user.id)
    new_session = models.UserSession(
        user_id=user.id,
        refresh_token=None,
        hashed_refresh_token=pwd_context.hash(new_refresh),
        expires_at=new_exp,
        user_agent=user_agent or session.user_agent,
        ip_address=ip_address or session.ip_address,
        device_info=device_info or session.device_info,
    )
    db.add(new_session)

    session.is_valid = False
    session.replaced_by = None
    db.commit()
    db.refresh(new_session)
    session.replaced_by = new_session.id
    db.add(session)
    db.commit()

    access_token = create_access_token({"sub": user.email, "session_id": new_session.id})
    return access_token, new_refresh, new_session


def refresh_access_token(db: Session, refresh_token: str):
    """Backward-compatible helper (deprecated) using rotation internally.

    Returns new access token; DOES NOT return new refresh token (for legacy implicit flow). If rotation occurs, caller cannot update cookie -> should migrate to explicit endpoint.
    """
    rotated = rotate_refresh_token(db, refresh_token)
    if not rotated:
        return None
    access_token, new_refresh, new_session = rotated
    log_event("Implicit refresh performed without cookie update (deprecated path)")
    return access_token


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
    
    if not token:
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        session_id: int = payload.get("session_id")
        
        if not email:
            log_event("Token validation failed: missing email in token")
            raise credentials_exception
            
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            log_event(f"Token validation failed: user with email {email} not found")
            raise credentials_exception
            
        token_data = TokenData(username=user.username, session_id=session_id)
    except JWTError:
        log_event("Token validation failed: JWT decode error")
        raise credentials_exception

    if token_data.session_id:
        session = db.query(models.UserSession).filter(
            models.UserSession.id == token_data.session_id,
            models.UserSession.user_id == user.id
        ).first()
        
        if session:
            if session.is_valid:
                session.last_activity = datetime.now(timezone.utc)
                db.commit()
            else:
                log_event(f"Session {session.id} for user {token_data.username} has been revoked. User logged out.")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session has been revoked",
                    headers={"WWW-Authenticate": "Bearer", "X-Session-Revoked": "true"},
                )
    
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
