from fastapi import APIRouter, Depends, HTTPException, Request, Response, Cookie, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app import models, schemas
from app.database import get_db
from app.utils.limiter import limiter
from app.utils.hashing import Hasher
from app.utils.password import validate_password_strength, is_password_breached, PasswordPolicyError
from app.services import auth
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime, timezone
from app.utils.logger import log_event
from typing import List, Optional, Dict, Tuple
import pyotp
import secrets
import json
from jose import jwt
from time import time

router = APIRouter()

_registration_attempts: Dict[str, Tuple[int, float]] = {}
_REG_WINDOW_SECONDS = 60 * 5
_REG_MAX_ATTEMPTS = 5


@router.post("/register", response_model=schemas.UserRead)
@limiter.limit("3/minute")
def register_user(request: Request, user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    key = f"{user_data.email}:{request.client.host}" if request.client else user_data.email
    count, first_ts = _registration_attempts.get(key, (0, time()))
    now = time()
    if now - first_ts > _REG_WINDOW_SECONDS:
        count, first_ts = 0, now
    count += 1
    _registration_attempts[key] = (count, first_ts)
    if count > _REG_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")
    try:
        validate_password_strength(user_data.password)
    except PasswordPolicyError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if is_password_breached(user_data.password):
        raise HTTPException(status_code=422, detail="This password has appeared in a data breach. Choose a different one.")

    user_exists = db.query(models.User).filter(
        (models.User.username == user_data.username) |
        (models.User.email == user_data.email)
    ).first()
    if user_exists:
        log_event(f"User registration failed: {user_data.username} already exists")
        raise HTTPException(status_code=400, detail="Account with provided credentials already exists")

    hashed_pw = Hasher.hash_password(user_data.password)
    user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pw,
        role=models.UserRole.user
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        log_event(f"User registration race-condition conflict: {user_data.username}")
        raise HTTPException(status_code=400, detail="Account with provided credentials already exists")
    db.refresh(user)

    log_event(f"User registration successful: {user_data.username}")

    return user


@router.post("/login")
@limiter.limit("5/minute")
def login_user(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    email = form_data.username
    user = auth.authenticate_user(db, email, form_data.password)
    if not user:
        log_event(f"Login failed: email {email} not found or incorrect password")
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not user.is_active:
        log_event(f"Login failed: user with email {email} is not active")
        raise HTTPException(status_code=403, detail="User account is not active")

    if getattr(user, "two_factor_enabled", False):
        twofa_token = jwt.encode(
            {
                "sub": user.email,
                "twofa": True,
                "remember": False,
                "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
            },
            auth.SECRET_KEY,
            algorithm=auth.ALGORITHM,
        )
        log_event(f"2FA required at login for user: {user.username}")
        return {"requires_2fa": True, "twofa_token": twofa_token}

    access_token = auth.create_access_token(data={"sub": user.email})
    log_event(f"User logged in: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-with-remember")
@limiter.limit("5/minute")
def login_with_remember(
    request: Request,
    login_data: schemas.LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    user = auth.authenticate_user(db, login_data.email, login_data.password)
    if not user:
        log_event(f"Login failed: email {login_data.email} not found or incorrect password")
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not user.is_active:
        log_event(f"Login failed: user with email {login_data.email} is not active")
        raise HTTPException(status_code=403, detail="User account is not active")

    user_agent = request.headers.get("user-agent", "")
    ip_address = request.client.host
    device_info = f"{user_agent[:100]}"

    is_suspicious = auth.check_for_suspicious_activity(db, user.id, ip_address, user_agent)
    
    if getattr(user, "two_factor_enabled", False):
        twofa_token = jwt.encode(
            {
                "sub": user.email,
                "twofa": True,
                "remember": bool(login_data.remember_me),
                "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
            },
            auth.SECRET_KEY,
            algorithm=auth.ALGORITHM,
        )
        log_event(f"2FA required at login (remember) for user: {user.username}")
        return {"requires_2fa": True, "twofa_token": twofa_token}

    if login_data.remember_me:
        refresh_token, expires_at = auth.create_refresh_token(user.id)
        
        session = auth.create_user_session(
            db, user.id, refresh_token, expires_at, 
            user_agent, ip_address, device_info
        )
        
        access_token = auth.create_access_token(
            data={"sub": user.email, "session_id": session.id}
        )
        
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=60 * 60 * 24 * auth.REFRESH_TOKEN_EXPIRE_DAYS,
            path="/"
        )
        
        log_event(f"User logged in with remember-me: {user.username}, suspicious: {is_suspicious}")
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    else:
        access_token = auth.create_access_token(
            data={"sub": user.email}
        )
        log_event(f"User logged in without remember-me: {user.username}")
        
        return {
            "access_token": access_token,
            "refresh_token": "",
            "token_type": "bearer"
        }


@router.post("/login/2fa-verify")
@limiter.limit("10/minute")
def login_twofa_verify(
    payload: schemas.TwoFAVerifyRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    if not payload or not payload.setup_token:
        raise HTTPException(status_code=400, detail="Missing payload or setup token")
    twofa_token = payload.setup_token
    if not twofa_token:
        raise HTTPException(status_code=400, detail="Missing twofa token")
    try:
        data = jwt.decode(twofa_token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email = data.get("sub")
        remember = bool(data.get("remember"))
        twofa_flag = data.get("twofa")
        if not email or not twofa_flag:
            raise HTTPException(status_code=400, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not getattr(user, "two_factor_enabled", False):
        raise HTTPException(status_code=400, detail="2FA not enabled")

    verified = False
    if user.two_factor_secret:
        totp = pyotp.TOTP(user.two_factor_secret)
        verified = totp.verify(payload.code, valid_window=1)

    if not verified and user.two_factor_recovery_codes:
        try:
            codes = json.loads(user.two_factor_recovery_codes) or []
        except Exception:
            codes = []

        matched_index = None
        for i, h in enumerate(codes):
            try:
                if isinstance(h, str) and Hasher.verify_password(payload.code, h):
                    matched_index = i
                    break
            except Exception:
                continue
        if matched_index is not None:
            verified = True
            codes.pop(matched_index)
            user.two_factor_recovery_codes = json.dumps(codes)
            db.add(user)
            db.commit()

    if not verified:
        raise HTTPException(status_code=400, detail="Invalid code")

    user_agent = request.headers.get("user-agent", "")
    ip_address = request.client.host if request.client else None
    device_info = f"{user_agent[:100]}"

    if remember:
        refresh_token, expires_at = auth.create_refresh_token(user.id)
        session = auth.create_user_session(
            db, user.id, refresh_token, expires_at, user_agent, ip_address, device_info
        )
        access_token = auth.create_access_token(data={"sub": user.email, "session_id": session.id})
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=60 * 60 * 24 * auth.REFRESH_TOKEN_EXPIRE_DAYS,
            path="/",
        )
        return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}
    else:
        access_token = auth.create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserRead)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    log_event(f"User details requested: {current_user.username}")
    return current_user


@router.post("/refresh-token", response_model=schemas.Token)
def refresh_token(request: Request, response: Response, refresh_token: str = Cookie(None, alias="refresh_token"), db: Session = Depends(get_db)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")
    
    session = auth.get_session_by_refresh_token(db, refresh_token)
    if not session:
        response.delete_cookie(key="refresh_token")
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    session.last_activity = datetime.now(timezone.utc)
    db.commit()
    
    access_token = auth.create_access_token(
        data={"sub": session.user.email, "session_id": session.id}
    )
    
    log_event(f"Token refreshed for user: {session.user.username}")
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/sessions", response_model=List[schemas.UserSessionRead])
def get_user_sessions(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(models.UserSession).filter(
        models.UserSession.user_id == current_user.id,
        models.UserSession.is_valid == True
    ).all()
    
    log_event(f"Sessions listed for user: {current_user.username}")
    return sessions


@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(models.UserSession).filter(
        models.UserSession.id == session_id,
        models.UserSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.is_valid = False
    db.commit()
    
    log_event(f"Session {session_id} revoked for user: {current_user.username}")
    return {"message": "Session revoked successfully"}


@router.delete("/sessions")
def revoke_all_sessions(
    current_user: models.User = Depends(auth.get_current_user),
    current_session_id: Optional[int] = Query(None),
    keep_current: bool = Query(True),
    token: str = Depends(auth.oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        if current_session_id is not None:
            current_session_id = int(current_session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format")
    
    if keep_current and current_session_id is None and token:
        try:
            payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
            session_id = payload.get("session_id")
            if session_id:
                current_session_id = session_id
        except Exception as e:
            log_event(f"Error decoding token: {str(e)}")
    
    if keep_current and current_session_id:
        auth.invalidate_all_user_sessions(db, current_user.id, current_session_id)
        log_event(f"All sessions except current revoked for user: {current_user.username}, kept session ID: {current_session_id}")
        return {"message": "All other sessions revoked successfully"}
    else:
        auth.invalidate_all_user_sessions(db, current_user.id)
        log_event(f"All sessions revoked for user: {current_user.username}")
        return {"message": "All sessions revoked successfully"}

@router.post("/logout")
def logout(
    response: Response,
    current_user: models.User = Depends(auth.get_current_user),
    refresh_token: str = Cookie(None, alias="refresh_token"),
    db: Session = Depends(get_db)
):
    response.delete_cookie(key="refresh_token")
    
    if refresh_token:
        session = auth.get_session_by_refresh_token(db, refresh_token)
        if session:
            session.is_valid = False
            db.commit()
            log_event(f"User logged out, session invalidated: {current_user.username}")
            return {"message": "Logged out successfully, session invalidated"}
    
    log_event(f"User logged out: {current_user.username}")
    return {"message": "Logged out successfully"}


def _generate_recovery_codes(n: int = 10) -> list[str]:
    return [secrets.token_hex(4) + "-" + secrets.token_hex(4) for _ in range(n)]


@router.post("/2fa/setup/start", response_model=schemas.TwoFASetupStart)
def twofa_setup_start(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.two_factor_enabled and current_user.two_factor_secret:
        raise HTTPException(status_code=400, detail="2FA already enabled")

    secret = pyotp.random_base32()
    issuer = "BeeTrack"
    label = current_user.email
    provisioning_uri = pyotp.totp.TOTP(secret).provisioning_uri(name=label, issuer_name=issuer)

    setup_token = secrets.token_urlsafe(24)
    current_user.two_factor_secret = secret
    db.add(current_user)
    db.commit()

    log_event(f"2FA setup started for user: {current_user.username}")
    return {"provisioning_uri": provisioning_uri, "secret": secret, "setup_token": setup_token}


@router.post("/2fa/setup/verify", response_model=schemas.TwoFAVerifyResponse)
def twofa_setup_verify(payload: schemas.TwoFAVerifyRequest, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if not current_user.two_factor_secret:
        raise HTTPException(status_code=400, detail="2FA setup not initiated")

    totp = pyotp.TOTP(current_user.two_factor_secret)
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")

    current_user.two_factor_enabled = True
    current_user.two_factor_confirmed_at = datetime.now(timezone.utc)
    recovery_codes = _generate_recovery_codes()
    hashed_codes = [Hasher.hash_password(c) for c in recovery_codes]
    current_user.two_factor_recovery_codes = json.dumps(hashed_codes)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    log_event(f"2FA enabled for user: {current_user.username}")
    return {"recovery_codes": recovery_codes}


@router.post("/2fa/disable")
def twofa_disable(payload: schemas.TwoFADisableRequest, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if not current_user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA not enabled")

    provided = (payload.password or "").strip() or (payload.code or "").strip()
    if not provided:
        raise HTTPException(status_code=400, detail="Provide password or 2FA code to disable")

    authorized = False

    if payload.password:
        try:
            authorized = Hasher.verify_password(payload.password, current_user.hashed_password)
        except Exception:
            pass

    consumed_recovery_index = None
    if not authorized and payload.code:
        if current_user.two_factor_secret:
            try:
                totp = pyotp.TOTP(current_user.two_factor_secret)
                authorized = totp.verify(payload.code, valid_window=1)
            except Exception:
                pass
        if not authorized and current_user.two_factor_recovery_codes:
            try:
                codes = json.loads(current_user.two_factor_recovery_codes) or []
            except Exception:
                codes = []

            for i, h in enumerate(codes):
                try:
                    if isinstance(h, str) and Hasher.verify_password(payload.code, h):
                        consumed_recovery_index = i
                        authorized = True
                        break
                except Exception:
                    continue

    if not authorized:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if consumed_recovery_index is not None:
        try:
            codes = json.loads(current_user.two_factor_recovery_codes) or []
        except Exception:
            codes = []
        if 0 <= consumed_recovery_index < len(codes):
            codes.pop(consumed_recovery_index)
            current_user.two_factor_recovery_codes = json.dumps(codes)

    current_user.two_factor_enabled = False
    current_user.two_factor_secret = None
    current_user.two_factor_confirmed_at = None
    current_user.two_factor_recovery_codes = None
    db.add(current_user)
    db.commit()

    auth.invalidate_all_user_sessions(db, current_user.id)

    log_event(f"2FA disabled for user: {current_user.username}")
    return {"message": "2FA disabled"}


@router.post("/2fa/recovery/regenerate", response_model=schemas.TwoFARegenerateResponse)
def twofa_regenerate(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if not current_user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA not enabled")
    recovery_codes = _generate_recovery_codes()
    hashed_codes = [Hasher.hash_password(c) for c in recovery_codes]
    current_user.two_factor_recovery_codes = json.dumps(hashed_codes)
    db.add(current_user)
    db.commit()
    log_event(f"2FA recovery codes regenerated for user: {current_user.username}")
    return {"recovery_codes": recovery_codes}


@router.put("/me", response_model=schemas.Token)
def update_me(
    user_data: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    update_data = user_data.dict(exclude_unset=True)

    if "password" in update_data:
        try:
            validate_password_strength(update_data["password"])
        except PasswordPolicyError as e:
            raise HTTPException(status_code=422, detail=str(e))
        if is_password_breached(update_data["password"]):
            raise HTTPException(status_code=422, detail="This password has appeared in a data breach. Choose a different one.")
        update_data["hashed_password"] = Hasher.hash_password(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(current_user, key, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    if not current_user:
        log_event(f"User update failed: {current_user.username} not found")
        raise HTTPException(status_code=404, detail="User not found")
    
    access_token = auth.create_access_token(
        data={"sub": current_user.email},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    log_event(f"User updated: {current_user.username}")
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.put("/{user_id}", response_model=schemas.UserRead)
def update_user(
    user_id: int,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.requires_role("admin"))
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        log_event(f"Admin update failed: user {user_id} not found")
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_data.dict(exclude_unset=True)
    if "password" in update_data:
        try:
            validate_password_strength(update_data["password"])
        except PasswordPolicyError as e:
            raise HTTPException(status_code=422, detail=str(e))
        if is_password_breached(update_data["password"]):
            raise HTTPException(status_code=422, detail="This password has appeared in a data breach. Choose a different one.")
        update_data["hashed_password"] = Hasher.hash_password(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(user, key, value)

    db.add(user)
    db.commit()
    db.refresh(user)

    log_event(f"Admin updated user: {user.username}")

    return user


@router.get("/", response_model=schemas.UserPage)
def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.requires_role("admin"))
):
    query = db.query(models.User).order_by(models.User.id)
    total = query.order_by(None).count()
    items = query.limit(size).offset((page - 1) * size).all()
    pages = (total + size - 1) // size if size else 0
    log_event(
        f"User list requested by admin: {current_admin.username} page={page} size={size} total={total}"
    )
    return {
        "meta": {
            "page": page,
            "size": size,
            "total": total,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        },
        "items": items,
    }

@router.get("/{user_id}", response_model=schemas.UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        log_event(f"User not found: {user_id}")
        raise HTTPException(status_code=404, detail="User not found")
    log_event(f"User details requested: {user.username} by {current_user.username}")
    return user
