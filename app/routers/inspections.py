from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.services.auth import get_current_user, requires_role
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=schemas.InspectionRead)
def create_inspection(
    inspection: schemas.InspectionCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    hive = db.query(models.Hive).get(inspection.hive_id)
    if not hive:
        raise HTTPException(status_code=404, detail="Hive not found")

    new_inspection = models.Inspection(**inspection.dict())
    db.add(new_inspection)

    # Zaktualizuj datę ostatniej inspekcji ula
    hive.last_inspection_date = inspection.date or datetime.utcnow()

    db.commit()
    db.refresh(new_inspection)
    return new_inspection


@router.get("/", response_model=list[schemas.InspectionRead])
def list_inspections(db: Session = Depends(get_db)):
    return db.query(models.Inspection).all()


@router.get("/hive/{hive_id}", response_model=list[schemas.InspectionRead])
def get_inspections_for_hive(hive_id: int, db: Session = Depends(get_db)):
    hive = db.query(models.Hive).get(hive_id)
    if not hive:
        raise HTTPException(status_code=404, detail="Hive not found")
    return db.query(models.Inspection).filter(models.Inspection.hive_id == hive_id).all()


@router.put("/{inspection_id}", response_model=schemas.InspectionRead)
def update_inspection(
    inspection_id: int,
    inspection: schemas.InspectionCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(requires_role("admin"))
):
    existing_inspection = db.query(models.Inspection).get(inspection_id)
    if not existing_inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    for key, value in inspection.dict(exclude_unset=True).items():
        setattr(existing_inspection, key, value)

    db.commit()
    db.refresh(existing_inspection)
    return existing_inspection


@router.delete("/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(requires_role("admin"))
):
    inspection = db.query(models.Inspection).get(inspection_id)
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    db.delete(inspection)
    db.commit()
    return
