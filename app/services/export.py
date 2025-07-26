import os
import pandas as pd
from sqlalchemy.orm import Session
from app import models
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from datetime import datetime


def export_orders_to_csv(db: Session, path: str = "exports/orders.csv"):
    os.makedirs("exports", exist_ok=True)

    orders = db.query(models.Order).all()
    if not orders:
        return None

    rows = []
    for order in orders:
        for item in order.items:
            rows.append({
                "Order ID": order.id,
                "User ID": order.user_id,
                "Date": order.date.strftime("%Y-%m-%d"),
                "Status": order.status,
                "Product ID": item.product_id,
                "Quantity": item.quantity,
                "Price Each": item.price_each,
                "Total": item.quantity * item.price_each
            })

    df = pd.DataFrame(rows)
    df.to_csv(path, index=False)
    return path


def export_inspections_to_pdf(db: Session, path: str = "exports/inspections.pdf"):
    os.makedirs("exports", exist_ok=True)

    inspections = db.query(models.Inspection).all()
    if not inspections:
        return None

    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4
    y = height - 50
    c.setFont("Helvetica", 12)
    c.drawString(50, y, "BeeTrack – Inspection Report")
    y -= 30

    for i, inspection in enumerate(inspections):
        text = f"[{inspection.date.strftime('%Y-%m-%d')}] Hive {inspection.hive_id} | Temp: {inspection.temperature}°C | Disease: {inspection.disease_detected or 'none'}"
        c.drawString(50, y, text)
        y -= 20
        if y < 50:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 12)

    c.save()
    return path
