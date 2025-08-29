from pydantic import BaseModel, EmailStr, constr, field_validator
from typing import Annotated, Any
from enum import Enum
from datetime import datetime
from typing import Optional, List


class UserRole(str, Enum):
    admin = "admin"
    worker = "worker"
    user = "user"


# --------------------
# --- USER SCHEMAS ---
# --------------------

class UserBase(BaseModel):
    username: Annotated[str, constr(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_.-]+$")]
    email: EmailStr
    role: UserRole = UserRole.user
    created_at: datetime = None
    is_active: bool = True
    avatar_url: str | None = None
    theme: str | None = None
    timezone: str | None = None
    locale: str | None = None

    @field_validator("username")
    @classmethod
    def normalize_username(cls, v: str) -> str:
        v = v.strip()
        return v

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserCreate(UserBase):
    password: Annotated[str, constr(min_length=8)]


class UserRead(UserBase):
    id: int
    two_factor_enabled: bool | None = None

    class Config:
        orm_mode = True


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[Annotated[str, constr(min_length=8)]] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None
    theme: Optional[str] = None
    timezone: Optional[str] = None
    locale: Optional[str] = None

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
    email: Optional[EmailStr] = None
    session_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


# ------------------------
# --- 2FA TOTP SCHEMAS ---
# ------------------------

class TwoFASetupStart(BaseModel):
    provisioning_uri: str
    secret: str
    setup_token: str


class TwoFAVerifyRequest(BaseModel):
    code: str
    setup_token: Optional[str] = None


class TwoFAVerifyResponse(BaseModel):
    recovery_codes: list[str]


class TwoFADisableRequest(BaseModel):
    code: Optional[str] = None
    password: Optional[str] = None


class TwoFARegenerateResponse(BaseModel):
    recovery_codes: list[str]


class LoginRequires2FA(BaseModel):
    requires_2fa: bool = True
    twofa_token: str


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
    name: Optional[str] = None
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


# --------------------------
# --- PAGINATION SCHEMAS ---
# --------------------------

class PageMeta(BaseModel):
    page: int
    size: int
    total: int
    pages: int
    has_next: bool
    has_prev: bool


class Page(BaseModel):
    meta: PageMeta
    items: list[Any]


class HivePage(Page):
    items: list[HiveRead]


class ProductPage(Page):
    items: list[ProductRead]


class InspectionPage(Page):
    items: list[InspectionRead]


class OrderPage(Page):
    items: list[OrderRead]

class UserPage(Page):
    items: list[UserRead]


class CursorMeta(BaseModel):
    limit: int
    has_next: bool
    next_cursor: int | None = None


class LogEntry(BaseModel):
    id: int
    timestamp: datetime
    event: str
    level: str | None = None

    class Config:
        orm_mode = True


class LogCursorPage(BaseModel):
    meta: CursorMeta
    items: list[LogEntry]


class LogStats(BaseModel):
    total: int
    success: int
    error: int
    warning: int
    info: int


# ------------------------------
# --- ROLE CHANGE REQUESTS -----
# ------------------------------

class RoleRequestStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    canceled = "canceled"


class RoleRequestBase(BaseModel):
    to_role: UserRole
    reason: str | None = None


class RoleRequestCreate(RoleRequestBase):
    pass


class RoleRequestRead(BaseModel):
    id: int
    user_id: int
    from_role: UserRole
    to_role: UserRole
    status: RoleRequestStatus
    reason: str | None = None
    admin_comment: str | None = None
    decided_by: int | None = None
    created_at: datetime
    decided_at: datetime | None = None

    class Config:
        orm_mode = True


class RoleRequestDecision(BaseModel):
    approve: bool
    admin_comment: str | None = None


class RoleRequestCancel(BaseModel):
    reason: str | None = None


class RoleRequestPage(Page):
    items: list[RoleRequestRead]


class RoleRequestSummary(BaseModel):
    total: int
    pending: int
    last_status: str | None = None
    last_created_at: datetime | None = None


class RoleRequestDailyEntry(BaseModel):
    date: str
    pending: int = 0
    approved: int = 0
    rejected: int = 0
    canceled: int = 0


class RoleRequestDailySeries(BaseModel):
    items: list[RoleRequestDailyEntry]


class RoleRequestRejectionTemplates(BaseModel):
    templates: list[str]


# -------------------
# --- APIARIES ------
# -------------------

class ApiaryRole(str, Enum):
    owner = "owner"
    manager = "manager"
    worker = "worker"


class InvitationStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    canceled = "canceled"


class ApiaryBase(BaseModel):
    name: str
    location: str | None = None
    description: str | None = None


class ApiaryCreate(ApiaryBase):
    pass


class ApiaryRead(ApiaryBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        orm_mode = True


class ApiaryMemberRead(BaseModel):
    id: int
    apiary_id: int
    user_id: int
    role: ApiaryRole
    joined_at: datetime
    is_active: bool

    class Config:
        orm_mode = True


class ApiaryMemberUpdate(BaseModel):
    role: ApiaryRole


class ApiaryInviteCreate(BaseModel):
    email: EmailStr
    role: ApiaryRole = ApiaryRole.worker


class ApiaryInvitationRead(BaseModel):
    id: int
    apiary_id: int
    inviter_id: int
    invitee_email: EmailStr
    role: ApiaryRole
    status: InvitationStatus
    token: str
    created_at: datetime
    decided_at: datetime | None = None

    class Config:
        orm_mode = True
    last_decided_at: datetime | None = None


class ApiaryPage(Page):
    items: list[ApiaryRead]


class ApiaryMemberPage(Page):
    items: list[ApiaryMemberRead]


class ApiaryInvitationPage(Page):
    items: list[ApiaryInvitationRead]


class ApiaryTransferOwnershipRequest(BaseModel):
    new_owner_user_id: int
