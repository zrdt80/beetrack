from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.services.auth import get_current_user, requires_role
from typing import List
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=schemas.OrderRead)
def create_order(
    order_data: schemas.OrderCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    if not order_data.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one product")

    order = models.Order(user_id=user.id, date=datetime.utcnow(), status="pending", total_price=0)
    db.add(order)
    db.flush()  # uzyskujemy order.id

    total = 0
    for item in order_data.items:
        product = db.query(models.Product).get(item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for product '{product.name}'")

        product.stock_quantity -= item.quantity
        line_price = item.quantity * product.unit_price
        total += line_price

        order_item = models.OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price_each=product.unit_price
        )
        db.add(order_item)

    order.total_price = total
    db.commit()
    db.refresh(order)
    return order


@router.get("/", response_model=List[schemas.OrderRead])
def get_user_orders(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    return db.query(models.Order).filter(models.Order.user_id == user.id).all()


@router.get("/all", response_model=List[schemas.OrderRead])
def get_all_orders(
    db: Session = Depends(get_db),
    _: models.User = Depends(requires_role("admin"))
):
    return db.query(models.Order).all()


@router.put("/{order_id}", response_model=schemas.OrderRead)
def update_order_status(
    order_id: int,
    status_update: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    order = db.query(models.Order).get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if user.role != "admin" and order.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this order")

    if status_update.status not in ["pending", "processing", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status update")

    order.status = status_update.status
    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    order = db.query(models.Order).get(order_id)
    if not order or (user.role != "admin" and order.user_id != user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this order")

    # Zwróć produkty do magazynu
    for item in order.items:
        item.product.stock_quantity += item.quantity

    db.delete(order)
    db.commit()
    return
