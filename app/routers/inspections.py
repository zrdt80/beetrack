from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas
from app.database import get_db
from app.services.rbac import requires_permission, Perm
from app.utils.logger import log_event
from datetime import datetime, timezone

router = APIRouter()


def _recalc_last_inspection_date(db: Session, hive_ids: list[int]):
    if not hive_ids:
        return
    unique_ids = list(set(hive_ids))
    results = (
        db.query(models.Inspection.hive_id, func.max(models.Inspection.date))
        .filter(models.Inspection.hive_id.in_(unique_ids))
        .group_by(models.Inspection.hive_id)
        .all()
    )
    max_map = {hid: max_date for hid, max_date in results}
    for hid in unique_ids:
        hive = db.get(models.Hive, hid)
        if not hive:
            continue
        hive.last_inspection_date = max_map.get(hid)


@router.post("/", response_model=schemas.InspectionRead)
def create_inspection(
    inspection: schemas.InspectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.INSPECTIONS_CREATE))
):
    hive = db.get(models.Hive, inspection.hive_id)
    if not hive:
        log_event(f"Inspection creation failed: hive {inspection.hive_id} not found, attempted by {current_user.username}")
        raise HTTPException(status_code=404, detail="Hive not found")

    new_inspection = models.Inspection(**inspection.model_dump())
    
    if new_inspection.date is None:
        new_inspection.date = datetime.now(timezone.utc)
    
    if new_inspection.date.tzinfo is None:
        new_inspection.date = new_inspection.date.replace(tzinfo=timezone.utc)
    
    now_utc = datetime.now(timezone.utc)
    if new_inspection.date > now_utc:
        raise HTTPException(status_code=400, detail="Inspection date cannot be in the future")
    if hive.last_inspection_date and hive.last_inspection_date.tzinfo is None:
        hive.last_inspection_date = hive.last_inspection_date.replace(tzinfo=timezone.utc)
    db.add(new_inspection)

    
    if (hive.last_inspection_date is None) or (new_inspection.date > hive.last_inspection_date):
        hive.last_inspection_date = new_inspection.date

    db.commit()
    db.refresh(new_inspection)
    log_event(f"Inspection created for hive {hive.name} (ID: {inspection.hive_id}) by {current_user.username}")
    return new_inspection


@router.get("/", response_model=schemas.InspectionPage)
def list_inspections(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: models.User = Depends(requires_permission(Perm.INSPECTIONS_VIEW))
):
    
    query = db.query(models.Inspection).order_by(models.Inspection.date.desc(), models.Inspection.id.desc())
    total = query.order_by(None).count()
    items = query.limit(size).offset((page - 1) * size).all()
    pages = (total + size - 1) // size if size else 0
    log_event(f"Inspections list requested page={page} size={size} total={total}")
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


@router.get("/hive/{hive_id}", response_model=schemas.InspectionPage)
def get_inspections_for_hive(
    hive_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: models.User = Depends(requires_permission(Perm.INSPECTIONS_VIEW))
):
    hive = db.get(models.Hive, hive_id)
    if not hive:
        log_event(f"Inspections request failed: hive {hive_id} not found")
        raise HTTPException(status_code=404, detail="Hive not found")
    query = (
        db.query(models.Inspection)
        .filter(models.Inspection.hive_id == hive_id)
        .order_by(models.Inspection.date.desc(), models.Inspection.id.desc())
    )
    total = query.order_by(None).count()
    items = query.limit(size).offset((page - 1) * size).all()
    pages = (total + size - 1) // size if size else 0
    log_event(f"Inspections requested for hive {hive.name} (ID: {hive_id}) page={page} size={size} total={total}")
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


@router.put("/{inspection_id}", response_model=schemas.InspectionRead)
def update_inspection(
    inspection_id: int,
    inspection: schemas.InspectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.INSPECTIONS_MANAGE))
):
    existing_inspection = db.get(models.Inspection, inspection_id)
    if not existing_inspection:
        log_event(f"Inspection update failed: inspection {inspection_id} not found, attempted by admin {current_user.username}")
        raise HTTPException(status_code=404, detail="Inspection not found")

    old_hive_id = existing_inspection.hive_id

    for key, value in inspection.model_dump(exclude_unset=True).items():
        setattr(existing_inspection, key, value)
    
    if existing_inspection.date is None:
        existing_inspection.date = datetime.now(timezone.utc)
    if existing_inspection.date.tzinfo is None:
        existing_inspection.date = existing_inspection.date.replace(tzinfo=timezone.utc)
    if existing_inspection.date > datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Inspection date cannot be in the future")

    db.commit()
    db.refresh(existing_inspection)
    
    affected = [old_hive_id]
    if existing_inspection.hive_id != old_hive_id:
        affected.append(existing_inspection.hive_id)
    _recalc_last_inspection_date(db, affected)
    db.commit()

    log_event(f"Inspection updated: ID {inspection_id} by admin {current_user.username}")
    return existing_inspection


@router.delete("/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_permission(Perm.INSPECTIONS_MANAGE))
):
    inspection = db.get(models.Inspection, inspection_id)
    if not inspection:
        log_event(f"Inspection deletion failed: inspection {inspection_id} not found, attempted by admin {current_user.username}")
        raise HTTPException(status_code=404, detail="Inspection not found")

    hive_id = inspection.hive_id
    db.delete(inspection)
    db.commit()

    _recalc_last_inspection_date(db, [hive_id])
    db.commit()

    log_event(f"Inspection deleted: ID {inspection_id} by admin {current_user.username}")
    return
