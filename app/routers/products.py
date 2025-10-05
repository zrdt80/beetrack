from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas
from app.database import get_db
from app.services.auth import requires_role
from app.utils.logger import log_event

router = APIRouter()


@router.post("/", response_model=schemas.ProductRead)
def create_product(
    product: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    normalized_name = product.name.strip()
    exists = (
        db.query(models.Product)
        .filter(func.lower(models.Product.name) == normalized_name.lower())
        .first()
    )
    if exists:
        log_event(
            f"Product creation failed: '{normalized_name}' already exists (case-insensitive), attempted by admin {current_user.username}"
        )
        raise HTTPException(status_code=400, detail="Product with this name already exists")
    payload = product.model_dump()
    payload["name"] = normalized_name
    new_product = models.Product(**payload)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    log_event(f"Product created: {product.name} by admin {current_user.username}")
    return new_product


@router.get("/", response_model=schemas.ProductPage)
def list_products(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    response: Response = None,
    db: Session = Depends(get_db)
):
    if response:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    
    query = db.query(models.Product).order_by(models.Product.id)
    total = query.order_by(None).count()
    items = query.limit(size).offset((page - 1) * size).all()
    pages = (total + size - 1) // size if size else 0
    log_event(f"Products list requested page={page} size={size} total={total}")
    return {
        "meta": {
            "page": page,
            "size": size,
            "total": total,
            "pages": pages,
            "has_next": page < pages,
            "has_prev": page > 1,
        },
        "items": items,
    }


@router.get("/{product_id}", response_model=schemas.ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(models.Product, product_id)
    if not product:
        log_event(f"Product not found: {product_id}")
        raise HTTPException(status_code=404, detail="Product not found")
    log_event(f"Product details requested: {product.name} (ID: {product_id})")
    return product


@router.put("/{product_id}", response_model=schemas.ProductRead)
def update_product(
    product_id: int,
    product_data: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    product = db.get(models.Product, product_id)
    if not product:
        log_event(f"Product update failed: product {product_id} not found, attempted by admin {current_user.username}")
        raise HTTPException(status_code=404, detail="Product not found")

    payload = product_data.model_dump(exclude_unset=True)
    if "name" in payload and payload["name"] is not None:
        new_name = payload["name"].strip()
        if new_name != product.name:
            conflict = (
                db.query(models.Product)
                .filter(
                    func.lower(models.Product.name) == new_name.lower(),
                    models.Product.id != product_id,
                )
                .first()
            )
            if conflict:
                log_event(
                    f"Product update failed: name '{new_name}' already exists (case-insensitive, ID: {conflict.id}), attempted by admin {current_user.username}"
                )
                raise HTTPException(status_code=400, detail="Product with this name already exists (case-insensitive)")
        payload["name"] = new_name

    for key, value in payload.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    log_event(f"Product updated: {product.name} (ID: {product_id}) by admin {current_user.username}")
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    product = db.get(models.Product, product_id)
    if not product:
        log_event(f"Product deletion failed: product {product_id} not found, attempted by admin {current_user.username}")
        raise HTTPException(status_code=404, detail="Product not found")

    order_items_count = db.query(models.OrderItem).filter(models.OrderItem.product_id == product_id).count()
    if order_items_count > 0:
        log_event(f"Product deletion failed: product {product_id} ({product.name}) is referenced in {order_items_count} order(s), attempted by admin {current_user.username}")
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete product '{product.name}' because it is referenced in {order_items_count} order(s). Remove the product from all orders first."
        )

    product_name = product.name
    db.delete(product)
    db.flush()
    db.commit()
    log_event(f"Product deleted: {product_name} (ID: {product_id}) by admin {current_user.username}")
    return
