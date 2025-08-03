from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.utils.hashing import Hasher
from app.services import auth
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from app.utils.logger import log_event

router = APIRouter()


@router.post("/register", response_model=schemas.UserRead)
def register_user(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
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
        role=models.UserRole.worker
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_event(f"User registration successful: {user_data.username}")

    return user


@router.post("/login", response_model=schemas.Token)
def login_user(
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
        data={"sub": user.username},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    log_event(f"User logged in: {form_data.username}")
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserRead)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    log_event(f"User details requested: {current_user.username}")
    return current_user

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