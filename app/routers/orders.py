from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.services.auth import get_current_user, requires_role
from app.utils.logger import log_event
from typing import List
from datetime import datetime, timezone

router = APIRouter()


@router.post("/", response_model=schemas.OrderRead)
def create_order(
    order_data: schemas.OrderCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    if not order_data.items:
        log_event(f"Order creation failed: empty order attempted by {user.username}")
        raise HTTPException(status_code=400, detail="Order must contain at least one product")

    order = models.Order(user_id=user.id, date=datetime.now(timezone.utc), status="pending", total_price=0)
    db.add(order)
    db.flush()

    total = 0
    product_names = []
    for item in order_data.items:
        product = db.query(models.Product).get(item.product_id)
        if not product:
            log_event(f"Order creation failed: product ID {item.product_id} not found, attempted by {user.username}")
            raise HTTPException(status_code=404, detail=f"Product ID {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            log_event(f"Order creation failed: insufficient stock for product '{product.name}' (requested: {item.quantity}, available: {product.stock_quantity}), attempted by {user.username}")
            raise HTTPException(status_code=400, detail=f"Not enough stock for product '{product.name}'")

        product.stock_quantity -= item.quantity
        line_price = item.quantity * product.unit_price
        total += line_price
        product_names.append(f"{product.name} x{item.quantity}")

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
    log_event(f"Order created: ID {order.id} by {user.username}, items: {', '.join(product_names)}, total: ${total:.2f}")
    return order


@router.get("/", response_model=List[schemas.OrderRead])
def get_user_orders(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    orders = db.query(models.Order).filter(models.Order.user_id == user.id).all()
    log_event(f"User orders requested by {user.username}, found {len(orders)} orders")
    return orders


@router.get("/all", response_model=List[schemas.OrderRead])
def get_all_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    orders = db.query(models.Order).all()
    log_event(f"All orders requested by admin {current_user.username}, found {len(orders)} orders")
    return orders


@router.put("/{order_id}", response_model=schemas.OrderRead)
def update_order_status(
    order_id: int,
    status_update: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    order = db.query(models.Order).get(order_id)
    if not order:
        log_event(f"Order update failed: order {order_id} not found, attempted by {user.username}")
        raise HTTPException(status_code=404, detail="Order not found")

    if user.role != "admin" and order.user_id != user.id:
        log_event(f"Order update failed: unauthorized access to order {order_id} by {user.username}")
        raise HTTPException(status_code=403, detail="Not authorized to update this order")

    if status_update.status not in ["pending", "processing", "completed", "cancelled"]:
        log_event(f"Order update failed: invalid status '{status_update.status}' for order {order_id} by {user.username}")
        raise HTTPException(status_code=400, detail="Invalid status update")

    old_status = order.status
    order.status = status_update.status
    db.commit()
    db.refresh(order)
    log_event(f"Order status updated: ID {order_id} from '{old_status}' to '{status_update.status}' by {user.username}")
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    order = db.query(models.Order).get(order_id)
    if not order or (user.role != "admin" and order.user_id != user.id):
        log_event(f"Order deletion failed: order {order_id} not found or unauthorized access by {user.username}")
        raise HTTPException(status_code=403, detail="Not authorized to delete this order")

    restored_items = []
    for item in order.items:
        item.product.stock_quantity += item.quantity
        restored_items.append(f"{item.product.name} x{item.quantity}")

    db.delete(order)
    db.commit()
    log_event(f"Order deleted: ID {order_id} by {user.username}, restored stock: {', '.join(restored_items)}")
    return
