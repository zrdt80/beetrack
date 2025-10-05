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
        from_attributes = True


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
        from_attributes = True


# ---------------------
# --- LOGIN SCHEMAS ---
# ---------------------

class Token(BaseModel):
    access_token: str
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
    expires_at: datetime


class UserSessionRead(UserSessionBase):
    id: int
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    is_valid: bool

    class Config:
        from_attributes = True


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
    status: Optional[str] = "active"


class HiveCreate(HiveBase):
    apiary_id: int | None = None


class HiveRead(HiveBase):
    id: int
    apiary_id: int | None = None
    apiary_name: str | None = None
    last_inspection_date: Optional[datetime]

    class Config:
        from_attributes = True


class ApiaryHiveCreate(HiveBase):
    pass


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
        from_attributes = True


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
    description: Optional[str] = None
    unit_price: Optional[float] = None
    stock_quantity: Optional[int] = None

    class Config:
        from_attributes = True


class ProductRead(ProductBase):
    id: int

    class Config:
        from_attributes = True


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
        from_attributes = True


class OrderRead(BaseModel):
    id: int
    user_id: int
    date: datetime
    status: str
    total_price: float
    items: List[OrderItemRead]

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str

    class Config:
        from_attributes = True


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
        from_attributes = True


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
        from_attributes = True


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
    owner_username: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApiaryMemberRead(BaseModel):
    id: int
    apiary_id: int
    user_id: int
    username: str | None = None
    role: ApiaryRole
    joined_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


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
        from_attributes = True
    last_decided_at: datetime | None = None


class ApiaryPage(Page):
    items: list[ApiaryRead]


class ApiaryMemberPage(Page):
    items: list[ApiaryMemberRead]


class ApiaryInvitationPage(Page):
    items: list[ApiaryInvitationRead]


class ApiaryTransferOwnershipRequest(BaseModel):
    new_owner_user_id: int


class ApiaryMemberAdd(BaseModel):
    user_id: int
    role: ApiaryRole = ApiaryRole.worker

    class Config:
        from_attributes = True


# ----------------------
# --- EXPORT SCHEMAS ---
# ----------------------

class ExportFormat(str, Enum):
    csv = "csv"
    pdf = "pdf"


class ExportDataType(str, Enum):
    orders = "orders"
    inspections = "inspections"
    hives = "hives"
    apiaries = "apiaries"


class ExportFilterBase(BaseModel):
    apiary_ids: Optional[List[int]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    format: ExportFormat = ExportFormat.csv
    timezone: Optional[str] = None
    
    @field_validator("apiary_ids")
    @classmethod
    def validate_apiary_ids(cls, v):
        if v is not None and len(v) == 0:
            return None
        return v


class OrderExportFilter(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    format: ExportFormat = ExportFormat.csv
    timezone: Optional[str] = None
    user_ids: Optional[List[int]] = None
    status_filter: Optional[List[str]] = None
    
    
class InspectionExportFilter(ExportFilterBase):
    hive_ids: Optional[List[int]] = None
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    disease_filter: Optional[List[str]] = None


class HiveExportFilter(BaseModel):
    apiary_ids: Optional[List[int]] = None
    format: ExportFormat = ExportFormat.csv
    timezone: Optional[str] = None
    status_filter: Optional[List[str]] = None
    last_inspection_days: Optional[int] = None
    
    @field_validator("apiary_ids")
    @classmethod
    def validate_apiary_ids(cls, v):
        if v is not None and len(v) == 0:
            return None
        return v


class ApiaryExportFilter(BaseModel):
    format: ExportFormat = ExportFormat.csv
    timezone: Optional[str] = None
    owner_ids: Optional[List[int]] = None
    include_member_count: bool = True
    include_hive_count: bool = True


class ExportRequest(BaseModel):
    data_type: ExportDataType
    filters: dict = {}
    
    
class ExportResponse(BaseModel):
    success: bool
    message: str
    filename: Optional[str] = None
    record_count: Optional[int] = None
    generated_at: datetime


class UserAccessibleApiaries(BaseModel):
    apiary_ids: List[int]
    is_admin: bool
    total_count: int


class ExportPermissionCheck(BaseModel):
    allowed: bool
    accessible_apiary_ids: List[int]
    error_message: Optional[str] = None


class DateRangeValidation(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, v, values):
        if v and values.get("start_date") and v < values.get("start_date"):
            raise ValueError("end_date must be after start_date")
        return v


class ApiaryOption(BaseModel):
    id: int
    name: str
    location: Optional[str] = None


class HiveOption(BaseModel):
    id: int
    name: str
    apiary_id: int
    apiary_name: str


class ExportPreview(BaseModel):
    data_type: ExportDataType
    estimated_records: int
    apiary_count: int
    date_range: Optional[str] = None
    filters_applied: List[str] = []

# -----------------------
# --- ERROR RESPONSES ---
# -----------------------

class ErrorDetail(BaseModel):
    loc: List[str] | None = None
    msg: str
    type: str | None = None


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: List[ErrorDetail] | None = None
    trace_id: str | None = None  # future correlation id

    @classmethod
    def simple(cls, code: str, message: str) -> "ErrorResponse":
        return cls(code=code, message=message)


# --------------------
# --- RBAC SCHEMAS ---
# --------------------

class PermissionBase(BaseModel):
    name: str
    description: str
    category: str


class PermissionRead(PermissionBase):
    id: int
    
    class Config:
        from_attributes = True


class RoleBase(BaseModel):
    name: str
    description: str | None = None
    is_system: bool = False


class RoleCreate(RoleBase):
    permissions: List[int] = []


class RoleUpdate(BaseModel):
    description: str | None = None
    permissions: List[int] | None = None


class RoleRead(RoleBase):
    id: int
    created_at: datetime
    permissions: List[PermissionRead] = []
    
    class Config:
        from_attributes = True


class UserRoleAssignmentBase(BaseModel):
    user_id: int
    role_id: int
    expires_at: datetime | None = None


class UserRoleAssignmentCreate(UserRoleAssignmentBase):
    pass


class UserRoleAssignmentRead(UserRoleAssignmentBase):
    id: int
    assigned_by: int | None = None
    assigned_at: datetime
    is_active: bool
    user: UserRead | None = None
    role: RoleRead | None = None
    
    class Config:
        from_attributes = True


class UserWithRoles(UserRead):
    role_assignments: List[UserRoleAssignmentRead] = []
    roles: List[RoleRead] = []
    permissions: List[str] = []
    
    class Config:
        from_attributes = True


class RolePermissionMatrix(BaseModel):
    roles: List[RoleRead] = []
    permissions: List[PermissionRead] = []
    matrix: dict[str, dict[str, bool]] = {}


class UserRoleStats(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    users_by_role: dict[str, int]
    active_assignments: int
    expired_assignments: int


class RBACOverview(BaseModel):
    permissions_count: int
    roles_count: int
    active_assignments_count: int
    user_stats: UserRoleStats
    recent_changes: List[dict] = []
