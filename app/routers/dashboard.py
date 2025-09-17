from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.services.auth import requires_role

router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    _admin=Depends(requires_role("admin")),
):
    now = datetime.now(timezone.utc)

    return {
        "timestamp": now.isoformat(),
        "cards": {
            "users": db.query(models.User).count(),
            "apiaries": db.query(models.Apiary).count(),
            "hives": db.query(models.Hive).count(),
            "inspections": db.query(models.Inspection).count(),
            "orders": db.query(models.Order).count(),
        },
    }
