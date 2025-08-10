from pydantic import BaseModel, EmailStr, constr
from enum import Enum
from datetime import datetime
from typing import Optional, List


class UserRole(str, Enum):
    admin = "admin"
    worker = "worker"


# --------------------
# --- USER SCHEMAS ---
# --------------------

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: UserRole = UserRole.worker
    created_at: datetime = None
    is_active: bool = True


class UserCreate(UserBase):
    password: constr(min_length=6)


class UserRead(UserBase):
    id: int

    class Config:
        orm_mode = True


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[constr(min_length=6)] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

    class Config:
        orm_mode = True


# ---------------------
# --- LOGIN SCHEMAS ---
# ---------------------

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None
    session_id: Optional[int] = None


class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False


# -----------------------
# --- SESSION SCHEMAS ---
# -----------------------

class UserSessionBase(BaseModel):
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    device_info: Optional[str] = None


class UserSessionCreate(UserSessionBase):
    user_id: int
    refresh_token: str
    expires_at: datetime


class UserSessionRead(UserSessionBase):
    id: int
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    is_valid: bool

    class Config:
        orm_mode = True


class UserSessionUpdate(BaseModel):
    last_activity: Optional[datetime] = None
    is_valid: Optional[bool] = None

    class Config:
        orm_mode = True


# --------------------
# --- HIVE SCHEMAS ---
# --------------------

class HiveBase(BaseModel):
    name: str
    location: Optional[str] = None
    status: Optional[str] = "active"


class HiveCreate(HiveBase):
    pass


class HiveRead(HiveBase):
    id: int
    last_inspection_date: Optional[datetime]

    class Config:
        orm_mode = True


# --------------------------
# --- INSPECTION SCHEMAS ---
# --------------------------

class InspectionBase(BaseModel):
    date: Optional[datetime] = None
    notes: Optional[str] = None
    temperature: Optional[float] = None
    disease_detected: Optional[str] = None


class InspectionCreate(InspectionBase):
    hive_id: int


class InspectionRead(InspectionBase):
    id: int
    hive_id: int

    class Config:
        orm_mode = True


# -----------------------
# --- PRODUCT SCHEMAS ---
# -----------------------

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    unit_price: float
    stock_quantity: int = 0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    description: Optional[str]
    unit_price: Optional[float]
    stock_quantity: Optional[int]

    class Config:
        orm_mode = True


class ProductRead(ProductBase):
    id: int

    class Config:
        orm_mode = True


# ---------------------
# --- ORDER SCHEMAS ---
# ---------------------

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]


class OrderItemRead(BaseModel):
    product_id: int
    quantity: int
    price_each: float

    class Config:
        orm_mode = True


class OrderRead(BaseModel):
    id: int
    user_id: int
    date: datetime
    status: str
    total_price: float
    items: List[OrderItemRead]

    class Config:
        orm_mode = True


class OrderStatusUpdate(BaseModel):
    status: str

    class Config:
        orm_mode = True