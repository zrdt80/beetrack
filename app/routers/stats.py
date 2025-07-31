from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.database import get_db
from app.models import Order, OrderItem, Inspection, Product
from app.services.auth import requires_role
from datetime import datetime

router = APIRouter()


@router.get("/first-year")
def get_first_year(db: Session = Depends(get_db),
    _: str = Depends(requires_role("admin"))
):
    first_order = db.query(func.min(Order.date)).scalar()
    if first_order:
        return first_order.year
    return datetime.now().year


@router.get("/monthly-sales")
def get_monthly_sales(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    _: str = Depends(requires_role("admin"))
):
    total_sales = db.query(func.sum(Order.total_price)).filter(
        extract("year", Order.date) == year,
        extract("month", Order.date) == month
    ).scalar() or 0.0

    total_orders = db.query(func.count(Order.id)).filter(
        extract("year", Order.date) == year,
        extract("month", Order.date) == month
    ).scalar() or 0

    return {
        "year": year,
        "month": month,
        "orders": total_orders,
        "total_sales": round(total_sales, 2)
    }


@router.get("/monthly-inspections")
def get_monthly_inspections(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    _: str = Depends(requires_role("admin"))
):
    count = db.query(func.count(Inspection.id)).filter(
        extract("year", Inspection.date) == year,
        extract("month", Inspection.date) == month
    ).scalar()

    return {
        "year": year,
        "month": month,
        "inspections": count
    }

@router.get("/yearly-top-products")
def get_yearly_top_products(
    year: int,
    limit: int = 5,
    db: Session = Depends(get_db),
    _: str = Depends(requires_role("admin"))
):
    result = db.query(
        Product.name,
        func.sum(OrderItem.quantity).label("total_sold")
    ).join(OrderItem.product).join(OrderItem.order).filter(
        extract("year", Order.date) == year
    ).group_by(Product.id).order_by(func.sum(OrderItem.quantity).desc()).limit(limit).all()

    return [{"product": r[0], "sold": int(r[1])} for r in result]


@router.get("/top-products")
def get_top_selling_products(
    limit: int = 5,
    db: Session = Depends(get_db),
    _: str = Depends(requires_role("admin"))
):
    result = db.query(
        Product.name,
        func.sum(OrderItem.quantity).label("total_sold")
    ).join(OrderItem.product).group_by(Product.id).order_by(func.sum(OrderItem.quantity).desc()).limit(limit).all()

    return [{"product": r[0], "sold": int(r[1])} for r in result]
