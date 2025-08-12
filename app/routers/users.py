from fastapi import APIRouter, Depends, HTTPException, Request, Response, Cookie, Query
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.utils.limiter import limiter
from app.utils.hashing import Hasher
from app.services import auth
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime, timezone
from app.utils.logger import log_event
from typing import List, Optional
from jose import jwt

router = APIRouter()


@router.post("/register", response_model=schemas.UserRead)
@limiter.limit("3/minute")
def register_user(request: Request, user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    user_exists = db.query(models.User).filter(
        (models.User.username == user_data.username) |
        (models.User.email == user_data.email)
    ).first()
    if user_exists:
        log_event(f"User registration failed: {user_data.username} already exists")
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_pw = Hasher.hash_password(user_data.password)
    user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pw,
        role=models.UserRole.user
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_event(f"User registration successful: {user_data.username}")

    return user


@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def login_user(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        log_event(f"Login failed: {form_data.username} not found or incorrect password")
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    if not user.is_active:
        log_event(f"Login failed: {form_data.username} is not active")
        raise HTTPException(status_code=403, detail="User account is not active")

    access_token = auth.create_access_token(
        data={"sub": user.username}
    )
    log_event(f"User logged in: {form_data.username}")
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-with-remember", response_model=schemas.TokenPair)
@limiter.limit("5/minute")
def login_with_remember(
    request: Request,
    login_data: schemas.LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    user = auth.authenticate_user(db, login_data.username, login_data.password)
    if not user:
        log_event(f"Login failed: {login_data.username} not found or incorrect password")
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    if not user.is_active:
        log_event(f"Login failed: {login_data.username} is not active")
        raise HTTPException(status_code=403, detail="User account is not active")

    user_agent = request.headers.get("user-agent", "")
    ip_address = request.client.host
    device_info = f"{user_agent[:100]}"

    is_suspicious = auth.check_for_suspicious_activity(db, user.id, ip_address, user_agent)
    
    if login_data.remember_me:
        refresh_token, expires_at = auth.create_refresh_token(user.id)
        
        session = auth.create_user_session(
            db, user.id, refresh_token, expires_at, 
            user_agent, ip_address, device_info
        )
        
        access_token = auth.create_access_token(
            data={"sub": user.username, "session_id": session.id}
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
        
        log_event(f"User logged in with remember-me: {login_data.username}, suspicious: {is_suspicious}")
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    else:
        access_token = auth.create_access_token(
            data={"sub": user.username}
        )
        log_event(f"User logged in without remember-me: {login_data.username}")
        
        return {
            "access_token": access_token,
            "refresh_token": "",
            "token_type": "bearer"
        }


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
        data={"sub": session.user.username, "session_id": session.id}
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


@router.put("/me", response_model=schemas.Token)
def update_me(
    user_data: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    update_data = user_data.dict(exclude_unset=True)

    if "password" in update_data:
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
        data={"sub": current_user.username},
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
        update_data["hashed_password"] = Hasher.hash_password(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(user, key, value)

    db.add(user)
    db.commit()
    db.refresh(user)

    log_event(f"Admin updated user: {user.username}")

    return user


@router.get("/", response_model=list[schemas.UserRead])
def list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.requires_role("admin"))
):
    log_event(f"User list requested by admin: {_.username}")
    return db.query(models.User).all()

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
