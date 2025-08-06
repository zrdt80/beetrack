from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth import requires_role
from app.services import export
from app.utils.logger import log_event

router = APIRouter()


@router.get("/orders/csv", response_class=FileResponse)
def download_orders_csv(
    db: Session = Depends(get_db),
    current_user: str = Depends(requires_role("admin"))
):
    path = export.export_orders_to_csv(db)
    if not path:
        log_event(f"Export failed: No orders to export for admin {current_user.username}")
        raise HTTPException(status_code=404, detail="No orders to export")
    log_event(f"Orders CSV exported by admin {current_user.username}")
    return FileResponse(path, media_type="text/csv", filename="orders.csv")


@router.get("/inspections/pdf", response_class=FileResponse)
def download_inspections_pdf(
    db: Session = Depends(get_db),
    current_user: str = Depends(requires_role("admin"))
):
    path = export.export_inspections_to_pdf(db)
    if not path:
        log_event(f"Export failed: No inspections to export for admin {current_user.username}")
        raise HTTPException(status_code=404, detail="No inspections to export")
    log_event(f"Inspections PDF exported by admin {current_user.username}")
    return FileResponse(path, media_type="application/pdf", filename="inspections.pdf")
