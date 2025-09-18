from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey,
    DateTime, Text, Enum, Boolean
)
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint
from datetime import datetime, timezone
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    worker = "worker"
    user = "user"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret = Column(String(64), nullable=True)
    two_factor_confirmed_at = Column(DateTime, nullable=True)
    two_factor_recovery_codes = Column(Text, nullable=True)
    avatar_url = Column(String(255), nullable=True)
    theme = Column(String(20), default="system", nullable=False)
    timezone = Column(String(64), default="UTC", nullable=False)
    locale = Column(String(10), default="en", nullable=False)

    orders = relationship("Order", back_populates="user")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete")
    role_change_requests = relationship(
        "RoleChangeRequest",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="RoleChangeRequest.user_id",
    )
    owned_apiaries = relationship("Apiary", back_populates="owner", cascade="all, delete-orphan")
    apiary_memberships = relationship("ApiaryMember", back_populates="user", cascade="all, delete-orphan")
    
    role_assignments = relationship("UserRoleAssignment", back_populates="user", foreign_keys="UserRoleAssignment.user_id", cascade="all, delete-orphan")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    refresh_token = Column(String(256), unique=True, nullable=True)
    hashed_refresh_token = Column(String(256), nullable=True, index=True)
    user_agent = Column(String(256))
    ip_address = Column(String(50))
    device_info = Column(String(256))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    last_activity = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_valid = Column(Boolean, default=True)
    replaced_by = Column(Integer, nullable=True)

    user = relationship("User", back_populates="sessions")


class Hive(Base):
    __tablename__ = "hives"
    __table_args__ = (
        UniqueConstraint('apiary_id', 'name', name='uq_hives_apiary_name'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    status = Column(String(50), default="active")
    last_inspection_date = Column(DateTime)
    apiary_id = Column(Integer, ForeignKey("apiaries.id"), nullable=False, index=True)

    inspections = relationship("Inspection", back_populates="hive", cascade="all, delete-orphan", passive_deletes=True)
    apiary = relationship("Apiary", back_populates="hives")


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    hive_id = Column(Integer, ForeignKey("hives.id"), nullable=False)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    notes = Column(Text)
    temperature = Column(Float)
    disease_detected = Column(String(100), default="none")

    hive = relationship("Hive", back_populates="inspections", passive_deletes=True)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    unit_price = Column(Float, nullable=False)
    stock_quantity = Column(Integer, default=0)

    order_items = relationship("OrderItem", back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String(50), default="pending")
    total_price = Column(Float, default=0.0)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_each = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    event = Column(String(255), nullable=False)
    level = Column(String(20), nullable=False, default="info", index=True)


class ApiaryRole(str, enum.Enum):
    owner = "owner"
    manager = "manager"
    worker = "worker"


class Apiary(Base):
    __tablename__ = "apiaries"
    __table_args__ = (
        UniqueConstraint('owner_id', 'name', name='uq_apiaries_owner_name'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(200))
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="owned_apiaries")
    members = relationship("ApiaryMember", back_populates="apiary", cascade="all, delete-orphan")
    hives = relationship("Hive", back_populates="apiary", cascade="all, delete-orphan")


class ApiaryMember(Base):
    __tablename__ = "apiary_members"

    id = Column(Integer, primary_key=True, index=True)
    apiary_id = Column(Integer, ForeignKey("apiaries.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(Enum(ApiaryRole), default=ApiaryRole.worker, nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

    apiary = relationship("Apiary", back_populates="members")
    user = relationship("User", back_populates="apiary_memberships")


class InvitationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    canceled = "canceled"


class ApiaryInvitation(Base):
    __tablename__ = "apiary_invitations"

    id = Column(Integer, primary_key=True, index=True)
    apiary_id = Column(Integer, ForeignKey("apiaries.id"), nullable=False, index=True)
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    invitee_email = Column(String(120), nullable=False, index=True)
    role = Column(Enum(ApiaryRole), default=ApiaryRole.worker, nullable=False)
    status = Column(Enum(InvitationStatus), default=InvitationStatus.pending, nullable=False, index=True)
    token = Column(String(64), unique=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    decided_at = Column(DateTime, nullable=True)

    apiary = relationship("Apiary")
    inviter = relationship("User")


class RoleRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    canceled = "canceled"


class RoleChangeRequest(Base):
    __tablename__ = "role_change_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    from_role = Column(Enum(UserRole), nullable=False)
    to_role = Column(Enum(UserRole), nullable=False)
    status = Column(Enum(RoleRequestStatus, name="requeststatus"), default=RoleRequestStatus.pending, nullable=False, index=True)
    reason = Column(String(500), nullable=True)
    admin_comment = Column(String(500), nullable=True)
    decided_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    decided_at = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="role_change_requests")
    admin = relationship("User", foreign_keys=[decided_by], viewonly=True)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(Integer, ForeignKey("user_sessions.id"), nullable=True, index=True)
    event_code = Column(String(64), nullable=False, index=True)
    severity = Column(String(16), nullable=False, default="info", index=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(256), nullable=True)
    metadata_json = Column("metadata", Text, nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    actor = relationship("User", foreign_keys=[actor_user_id])


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    is_system = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    role_permissions = relationship(
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan"
    )
    permissions = relationship(
        "Permission",
        secondary="role_permissions",
        viewonly=True
    )
    user_assignments = relationship("UserRoleAssignment", back_populates="role", cascade="all, delete-orphan")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    category = Column(String(64), nullable=True, index=True)
    is_system = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    role_permissions = relationship(
        "RolePermission",
        back_populates="permission",
        cascade="all, delete-orphan"
    )
    roles = relationship(
        "Role",
        secondary="role_permissions",
        viewonly=True
    )


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (
        UniqueConstraint('role_id', 'permission_id', name='uq_role_permission'),
    )

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False, index=True)
    granted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")


class UserRoleAssignment(Base):
    __tablename__ = "user_role_assignments"
    __table_args__ = (
        UniqueConstraint('user_id', 'role_id', name='uq_user_role'),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    user = relationship("User", foreign_keys=[user_id])
    role = relationship("Role", back_populates="user_assignments")
    assigner = relationship("User", foreign_keys=[assigned_by])
