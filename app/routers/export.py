from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth import requires_role
from app.services import export

router = APIRouter()


@router.get("/orders/csv", response_class=FileResponse)
def download_orders_csv(
    db: Session = Depends(get_db),
    _: str = Depends(requires_role("admin"))
):
    path = export.export_orders_to_csv(db)
    if not path:
        raise HTTPException(status_code=404, detail="No orders to export")
    return FileResponse(path, media_type="text/csv", filename="orders.csv")


@router.get("/inspections/pdf", response_class=FileResponse)
def download_inspections_pdf(
    db: Session = Depends(get_db),
    _: str = Depends(requires_role("admin"))
):
    path = export.export_inspections_to_pdf(db)
    if not path:
        raise HTTPException(status_code=404, detail="No inspections to export")
    return FileResponse(path, media_type="application/pdf", filename="inspections.pdf")
