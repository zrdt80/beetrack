from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.services.auth import get_current_user, requires_role
from app.utils.logger import log_event
from datetime import datetime, timezone

router = APIRouter()


@router.post("/", response_model=schemas.InspectionRead)
def create_inspection(
    inspection: schemas.InspectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    hive = db.query(models.Hive).get(inspection.hive_id)
    if not hive:
        log_event(f"Inspection creation failed: hive {inspection.hive_id} not found, attempted by {current_user.username}")
        raise HTTPException(status_code=404, detail="Hive not found")

    new_inspection = models.Inspection(**inspection.dict())
    db.add(new_inspection)

    hive.last_inspection_date = inspection.date or datetime.now(timezone.utc)

    db.commit()
    db.refresh(new_inspection)
    log_event(f"Inspection created for hive {hive.name} (ID: {inspection.hive_id}) by {current_user.username}")
    return new_inspection


@router.get("/", response_model=list[schemas.InspectionRead])
def list_inspections(db: Session = Depends(get_db)):
    inspections = db.query(models.Inspection).all()
    log_event(f"Inspections list requested, found {len(inspections)} inspections")
    return inspections


@router.get("/hive/{hive_id}", response_model=list[schemas.InspectionRead])
def get_inspections_for_hive(hive_id: int, db: Session = Depends(get_db)):
    hive = db.query(models.Hive).get(hive_id)
    if not hive:
        log_event(f"Inspections request failed: hive {hive_id} not found")
        raise HTTPException(status_code=404, detail="Hive not found")
    inspections = db.query(models.Inspection).filter(models.Inspection.hive_id == hive_id).all()
    log_event(f"Inspections requested for hive {hive.name} (ID: {hive_id}), found {len(inspections)} inspections")
    return inspections


@router.put("/{inspection_id}", response_model=schemas.InspectionRead)
def update_inspection(
    inspection_id: int,
    inspection: schemas.InspectionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    existing_inspection = db.query(models.Inspection).get(inspection_id)
    if not existing_inspection:
        log_event(f"Inspection update failed: inspection {inspection_id} not found, attempted by admin {current_user.username}")
        raise HTTPException(status_code=404, detail="Inspection not found")

    for key, value in inspection.dict(exclude_unset=True).items():
        setattr(existing_inspection, key, value)

    db.commit()
    db.refresh(existing_inspection)
    log_event(f"Inspection updated: ID {inspection_id} by admin {current_user.username}")
    return existing_inspection


@router.delete("/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(requires_role("admin"))
):
    inspection = db.query(models.Inspection).get(inspection_id)
    if not inspection:
        log_event(f"Inspection deletion failed: inspection {inspection_id} not found, attempted by admin {current_user.username}")
        raise HTTPException(status_code=404, detail="Inspection not found")

    db.delete(inspection)
    db.commit()
    log_event(f"Inspection deleted: ID {inspection_id} by admin {current_user.username}")
    return
