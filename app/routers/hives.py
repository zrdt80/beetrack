from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.services.auth import requires_role
from app.utils.logger import log_event

router = APIRouter()

@router.post("/", response_model=schemas.HiveRead)
def create_hive(
    hive: schemas.HiveCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    existing = db.query(models.Hive).filter(models.Hive.name == hive.name).first()
    if existing:
        log_event(f"Hive creation failed: {hive.name} already exists, attempted by admin {current_user.username}")
        raise HTTPException(status_code=400, detail="Hive with this name already exists")

    new_hive = models.Hive(**hive.dict())
    db.add(new_hive)
    db.commit()
    db.refresh(new_hive)
    log_event(f"Hive created: {hive.name} by admin {current_user.username}")
    return new_hive


@router.get("/", response_model=schemas.HivePage)
def list_hives(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(models.Hive).order_by(models.Hive.id)
    total = query.order_by(None).count()
    items = query.limit(size).offset((page - 1) * size).all()
    pages = (total + size - 1) // size if size else 0
    log_event(f"Hives list requested page={page} size={size} total={total}")
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


@router.get("/{hive_id}", response_model=schemas.HiveRead)
def get_hive(hive_id: int, db: Session = Depends(get_db)):
    hive = db.query(models.Hive).get(hive_id)
    if not hive:
        log_event(f"Hive not found: {hive_id}")
        raise HTTPException(status_code=404, detail="Hive not found")
    log_event(f"Hive details requested: {hive.name} (ID: {hive_id})")
    return hive


@router.put("/{hive_id}", response_model=schemas.HiveRead)
def update_hive(
    hive_id: int,
    hive_data: schemas.HiveCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    hive = db.query(models.Hive).get(hive_id)
    if not hive:
        log_event(f"Hive update failed: hive {hive_id} not found, attempted by admin {current_user.username}")
        raise HTTPException(status_code=404, detail="Hive not found")

    for key, value in hive_data.dict().items():
        setattr(hive, key, value)

    db.commit()
    db.refresh(hive)
    log_event(f"Hive updated: {hive.name} (ID: {hive_id}) by admin {current_user.username}")
    return hive


@router.delete("/{hive_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hive(
    hive_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    hive = db.query(models.Hive).get(hive_id)
    if not hive:
        log_event(f"Hive deletion failed: hive {hive_id} not found, attempted by admin {current_user.username}")
        raise HTTPException(status_code=404, detail="Hive not found")

    hive_name = hive.name
    db.delete(hive)
    db.commit()
    log_event(f"Hive deleted: {hive_name} (ID: {hive_id}) by admin {current_user.username}")
    return
