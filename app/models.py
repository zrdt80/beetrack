from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey,
    DateTime, Text, Enum, Boolean
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    worker = "worker"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.worker, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

    orders = relationship("Order", back_populates="user")


class Hive(Base):
    __tablename__ = "hives"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    location = Column(String(200))
    status = Column(String(50), default="active")
    last_inspection_date = Column(DateTime)

    inspections = relationship("Inspection", back_populates="hive")


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    hive_id = Column(Integer, ForeignKey("hives.id"), nullable=False)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    notes = Column(Text)
    temperature = Column(Float)
    disease_detected = Column(String(100), default="none")

    hive = relationship("Hive", back_populates="inspections")


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
