from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.services.auth import requires_role

router = APIRouter()

@router.post("/", response_model=schemas.HiveRead)
def create_hive(
    hive: schemas.HiveCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(requires_role("admin"))
):
    existing = db.query(models.Hive).filter(models.Hive.name == hive.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Hive with this name already exists")

    new_hive = models.Hive(**hive.dict())
    db.add(new_hive)
    db.commit()
    db.refresh(new_hive)
    return new_hive


@router.get("/", response_model=list[schemas.HiveRead])
def list_hives(db: Session = Depends(get_db)):
    return db.query(models.Hive).all()


@router.get("/{hive_id}", response_model=schemas.HiveRead)
def get_hive(hive_id: int, db: Session = Depends(get_db)):
    hive = db.query(models.Hive).get(hive_id)
    if not hive:
        raise HTTPException(status_code=404, detail="Hive not found")
    return hive


@router.put("/{hive_id}", response_model=schemas.HiveRead)
def update_hive(
    hive_id: int,
    hive_data: schemas.HiveCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(requires_role("admin"))
):
    hive = db.query(models.Hive).get(hive_id)
    if not hive:
        raise HTTPException(status_code=404, detail="Hive not found")

    for key, value in hive_data.dict().items():
        setattr(hive, key, value)

    db.commit()
    db.refresh(hive)
    return hive


@router.delete("/{hive_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hive(
    hive_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(requires_role("admin"))
):
    hive = db.query(models.Hive).get(hive_id)
    if not hive:
        raise HTTPException(status_code=404, detail="Hive not found")

    db.delete(hive)
    db.commit()
    return
