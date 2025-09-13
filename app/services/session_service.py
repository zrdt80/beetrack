from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from jose import jwt

from app import models
from app.utils.hashing import Hasher
from app.utils.logger import log_event, record_audit_event
from app.config import settings
from app.services import auth
from passlib.context import CryptContext

ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
ALGORITHM = "HS256"

class SessionService:
    def __init__(self, db: Session):
        self.db = db
        self._pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def authenticate(self, email: str, password: str) -> Optional[models.User]:
        user = self.db.query(models.User).filter(models.User.email == email).first()
        if not user:
            record_audit_event("LOGIN_FAILURE", user_id=None, metadata={"email": email})
            log_event(f"Authentication failed: user with email {email} not found")
            return None
        if not Hasher.verify_password(password, user.hashed_password):
            record_audit_event("LOGIN_FAILURE", user_id=user.id, metadata={"email": email})
            log_event(f"Authentication failed: incorrect password for email {email}")
            return None
        record_audit_event("LOGIN_SUCCESS", user_id=user.id)
        log_event(f"Authentication successful: user {user.username}")
        return user

    def create_access_token(self, *, user: models.User, session_id: Optional[int] = None, expires: Optional[timedelta] = None) -> str:
        data = {"sub": user.email}
        if session_id is not None:
            data["session_id"] = session_id
        expire = datetime.now(timezone.utc) + (expires or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        data["exp"] = expire
        return jwt.encode(data, settings.secret_key, algorithm=ALGORITHM)

    def start_session(self, user: models.User, refresh_token: str, refresh_exp: datetime, *, user_agent: str | None, ip: str | None, device: str | None) -> models.UserSession:
        session = models.UserSession(
            user_id=user.id,
            refresh_token=None,
            hashed_refresh_token=self._pwd.hash(refresh_token),
            expires_at=refresh_exp,
            user_agent=user_agent,
            ip_address=ip,
            device_info=device
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        record_audit_event("SESSION_CREATED", user_id=user.id, session_id=session.id, ip=ip, user_agent=user_agent)
        return session

    def rotate(self, refresh_token: str, *, user_agent: str | None, ip: str | None, device: str | None) -> Optional[Tuple[str, str, models.UserSession]]:
        rotated = auth.rotate_refresh_token(self.db, refresh_token, user_agent, ip, device)
        if not rotated:
            record_audit_event("REFRESH_FAILED", metadata={"reason": "invalid_or_reuse"})
            return None
        access_token, new_refresh, new_session = rotated
        record_audit_event("REFRESH_ROTATED", user_id=new_session.user_id, session_id=new_session.id, ip=ip, user_agent=user_agent)
        return access_token, new_refresh, new_session

    def revoke(self, session_id: int, *, actor_user_id: Optional[int] = None):
        session = self.db.query(models.UserSession).filter(models.UserSession.id == session_id).first()
        if not session:
            return False
        if not session.is_valid:
            return True
        session.is_valid = False
        self.db.commit()
        record_audit_event("SESSION_REVOKED", user_id=session.user_id, session_id=session.id, actor_user_id=actor_user_id)
        return True

    def revoke_all(self, user_id: int, *, keep_session_id: Optional[int] = None, actor_user_id: Optional[int] = None) -> int:
        q = self.db.query(models.UserSession).filter(models.UserSession.user_id == user_id, models.UserSession.is_valid == True)
        if keep_session_id:
            q = q.filter(models.UserSession.id != keep_session_id)
        sessions = q.all()
        for s in sessions:
            s.is_valid = False
        self.db.commit()
        record_audit_event("SESSIONS_REVOKED_ALL", user_id=user_id, metadata={"revoked": len(sessions), "kept": keep_session_id})
        return len(sessions)

    def mark_twofa_required(self, user: models.User):
        record_audit_event("2FA_REQUIRED", user_id=user.id)

    def mark_twofa_verified(self, user: models.User):
        record_audit_event("2FA_VERIFIED", user_id=user.id)

    def mark_twofa_failure(self, user: Optional[models.User]):
        record_audit_event("2FA_FAILURE", user_id=user.id if user else None)
