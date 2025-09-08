import os
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app import models, schemas
from app.utils.logger import log_event
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import pytz

UNICODE_FONT = 'Helvetica'
log_event("Using standard Helvetica font for PDF generation")


def format_datetime_for_user(dt: datetime, user_timezone: Optional[str] = None, format_string: str = "%Y-%m-%d %H:%M") -> str:
    if dt is None:
        return ""
    
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    if user_timezone:
        try:
            user_tz = pytz.timezone(user_timezone)
            dt = dt.astimezone(user_tz)
        except Exception:
            pass
    
    return dt.strftime(format_string)


def format_date_for_user(dt: datetime, user_timezone: Optional[str] = None) -> str:
    return format_datetime_for_user(dt, user_timezone, "%Y-%m-%d")


def get_user_timezone(user: models.User) -> Optional[str]:
    return user.timezone if user.timezone and user.timezone != "UTC" else None


def export_orders_to_csv(db: Session, path: str = "exports/orders.csv"):
    os.makedirs("exports", exist_ok=True)

    orders = db.query(models.Order).all()
    if not orders:
        log_event("Export failed: No orders found for CSV export")
        return None

    rows = []
    for order in orders:
        for item in order.items:
            rows.append({
                "Order ID": order.id,
                "User ID": order.user_id,
                "Date": order.date.strftime("%Y-%m-%d"),
                "Status": order.status.title(),
                "Product ID": item.product_id,
                "Quantity": item.quantity,
                "Price Each": f"${item.price_each:.2f}",
                "Total": f"${item.quantity * item.price_each:.2f}"
            })

    df = pd.DataFrame(rows)
    df.to_csv(path, index=False)
    log_event(f"Orders CSV exported successfully: {len(orders)} orders, {len(rows)} items to {path}")
    return path


def export_orders_to_pdf(db: Session, path: str = "exports/orders.pdf"):
    os.makedirs("exports", exist_ok=True)

    orders = db.query(models.Order).all()
    if not orders:
        log_event("Export failed: No orders found for PDF export")
        return None

    doc = SimpleDocTemplate(path, pagesize=A4, 
                          rightMargin=2*cm, leftMargin=2*cm,
                          topMargin=2*cm, bottomMargin=2*cm)
    
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#FF6F00'),
        fontName=UNICODE_FONT,
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.grey,
        fontName=UNICODE_FONT,
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        textColor=colors.HexColor('#E65100'),
        fontName=UNICODE_FONT,
    )
    
    title = Paragraph("BeeTrack Apiary Management System", title_style)
    elements.append(title)
    
    subtitle = Paragraph("Orders Report", subtitle_style)
    elements.append(subtitle)
    
    total_revenue = sum(sum(item.quantity * item.price_each for item in order.items) for order in orders)
    total_items = sum(sum(item.quantity for item in order.items) for order in orders)
    
    report_info = Paragraph(f"""
        <b>Generated:</b> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>
        <b>Total Orders:</b> {len(orders)}<br/>
        <b>Total Revenue:</b> ${total_revenue:.2f}<br/>
        <b>Total Items Sold:</b> {total_items}<br/>
        <b>Date Range:</b> {min(o.date for o in orders).strftime('%Y-%m-%d') if orders else 'N/A'} to {max(o.date for o in orders).strftime('%Y-%m-%d') if orders else 'N/A'}
    """, styles['Normal'])
    elements.append(report_info)
    elements.append(Spacer(1, 20))
    
    elements.append(HRFlowable(width="100%", thickness=2, lineCap='round', color=colors.HexColor('#FF6F00')))
    elements.append(Spacer(1, 20))
    
    status_summary = {}
    for order in orders:
        status = order.status
        if status in status_summary:
            status_summary[status] += 1
        else:
            status_summary[status] = 1
    
    summary_header = Paragraph("Order Status Summary", header_style)
    elements.append(summary_header)
    
    status_data = [['Status', 'Count', 'Percentage']]
    
    for status, count in status_summary.items():
        percentage = (count / len(orders)) * 100
        status_data.append([status.title(), str(count), f'{percentage:.1f}%'])
    
    status_table = Table(status_data, colWidths=[2*inch, 1*inch, 1.5*inch])
    status_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FFF3E0')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#E65100')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), UNICODE_FONT),  
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E0E0E0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9FA')])
    ]))
    
    elements.append(status_table)
    elements.append(Spacer(1, 30))
    
    details_header = Paragraph("Detailed Order Records", header_style)
    elements.append(details_header)
    elements.append(Spacer(1, 10))
    
    table_data = [['Order ID', 'Date', 'User ID', 'Status', 'Items', 'Total']]
    
    for order in sorted(orders, key=lambda x: x.date, reverse=True):
        order_total = sum(item.quantity * item.price_each for item in order.items)
        item_count = len(order.items)
        
        table_data.append([
            f'#{order.id}',
            order.date.strftime('%Y-%m-%d'),
            f'User {order.user_id}',
            order.status.title(),
            f'{item_count} items',
            f'${order_total:.2f}'
        ])
    
    orders_table = Table(table_data, colWidths=[0.8*inch, 1*inch, 1*inch, 1.2*inch, 1*inch, 1*inch])
    orders_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF6F00')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), UNICODE_FONT),  
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9FA')]),
        
        ('ALIGN', (5, 1), (5, -1), 'RIGHT'),
    ]))
    
    elements.append(orders_table)
    elements.append(Spacer(1, 20))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_CENTER,
        textColor=colors.grey,
    )
    
    footer = Paragraph(f"""
        <i>This report was automatically generated by BeeTrack Apiary Management System<br/>
        Total Revenue: ${total_revenue:.2f} • Total Orders: {len(orders)}</i>
    """, footer_style)
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=1, lineCap='round', color=colors.lightgrey))
    elements.append(Spacer(1, 10))
    elements.append(footer)
    
    doc.build(elements)
    
    log_event(f"Orders PDF exported successfully: {len(orders)} orders to {path}")
    return path


def export_inspections_to_pdf(db: Session, path: str = "exports/inspections.pdf"):
    os.makedirs("exports", exist_ok=True)

    inspections = db.query(models.Inspection).all()
    if not inspections:
        log_event("Export failed: No inspections found for PDF export")
        return None

    doc = SimpleDocTemplate(path, pagesize=A4, 
                          rightMargin=2*cm, leftMargin=2*cm,
                          topMargin=2*cm, bottomMargin=2*cm)
    
    elements = []
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#2E7D32'),
        fontName='Helvetica-Bold',
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=20,
        alignment=TA_CENTER,
        textColor=colors.grey,
        fontName='Helvetica',
    )
    
    cell_style = ParagraphStyle(
        'CellText',
        parent=styles['Normal'],
        fontSize=9,
        leading=11,
        alignment=TA_LEFT,
        fontName='Helvetica',
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        textColor=colors.HexColor('#1976D2'),
        fontName='Helvetica-Bold',
    )
    
    title = Paragraph("BeeTrack Apiary Management System", title_style)
    elements.append(title)
    
    subtitle = Paragraph("Inspection Report", subtitle_style)
    elements.append(subtitle)
    
    report_info = Paragraph(f"""
        <b>Generated:</b> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>
        <b>Total Inspections:</b> {len(inspections)}<br/>
        <b>Date Range:</b> {min(i.date for i in inspections).strftime('%Y-%m-%d') if inspections else 'N/A'} to {max(i.date for i in inspections).strftime('%Y-%m-%d') if inspections else 'N/A'}
    """, styles['Normal'])
    elements.append(report_info)
    elements.append(Spacer(1, 20))
    
    elements.append(HRFlowable(width="100%", thickness=2, lineCap='round', color=colors.HexColor('#2E7D32')))
    elements.append(Spacer(1, 20))
    
    summary_header = Paragraph("Summary Statistics", header_style)
    elements.append(summary_header)
    
    total_inspections = len(inspections)
    diseases_found = len([i for i in inspections if i.disease_detected and i.disease_detected != 'none'])
    avg_temp = sum(i.temperature for i in inspections if i.temperature) / len(inspections) if inspections else 0
    unique_hives = len(set(i.hive_id for i in inspections))
    
    summary_data = [
        ['Metric', 'Value'],
        ['Total Inspections', str(total_inspections)],
        ['Unique Hives Inspected', str(unique_hives)],
        ['Diseases Detected', str(diseases_found)],
        ['Average Temperature', f'{avg_temp:.1f}°C' if avg_temp else 'N/A'],
        ['Health Rate', f'{((total_inspections - diseases_found) / total_inspections * 100):.1f}%' if total_inspections else 'N/A']
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E3F2FD')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1976D2')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), UNICODE_FONT),  
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E0E0E0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9FA')])
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 30))
    
    details_header = Paragraph("Detailed Inspection Records", header_style)
    elements.append(details_header)
    elements.append(Spacer(1, 10))
    
    table_data = [['Date', 'Hive ID', 'Temperature', 'Disease', 'Notes']]
    
    def get_disease_display(disease_detected):
        if not disease_detected or disease_detected.lower() in ['none', '', 'healthy']:
            return '[HEALTHY] Healthy'
        
        disease_symbols = {
            'varroa': '[MITE]',
            'nosema': '[VIRUS]', 
            'american foulbrood': '[CRITICAL]',
            'european foulbrood': '[VIRUS]',
            'chalkbrood': '[FUNGAL]',
            'sacbrood': '[VIRUS]',
            'black queen cell virus': '[VIRUS]',
            'deformed wing virus': '[VIRUS]',
            'small hive beetle': '[BEETLE]',
            'wax moth': '[MOTH]'
        }
        
        disease_lower = disease_detected.lower().strip()
        
        if disease_lower in disease_symbols:
            return f'{disease_symbols[disease_lower]} {disease_detected.title()}'
        
        for disease_key, symbol in disease_symbols.items():
            if disease_key in disease_lower:
                return f'{symbol} {disease_detected.title()}'
        
        return f'[WARNING] {disease_detected.title()}'
    
    for inspection in sorted(inspections, key=lambda x: x.date, reverse=True):
        disease_display = get_disease_display(inspection.disease_detected)
        
        disease_paragraph = Paragraph(disease_display, cell_style)
        notes_text = (inspection.notes[:50] + '...') if inspection.notes and len(inspection.notes) > 50 else (inspection.notes or 'No notes')
        notes_paragraph = Paragraph(notes_text, cell_style)
            
        table_data.append([
            inspection.date.strftime('%Y-%m-%d'),
            f'Hive #{inspection.hive_id}',
            f'{inspection.temperature}°C' if inspection.temperature else 'N/A',
            disease_paragraph,
            notes_paragraph
        ])
    
    inspections_table = Table(table_data, colWidths=[1.2*inch, 1*inch, 1*inch, 1.8*inch, 2*inch])
    inspections_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E7D32')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), UNICODE_FONT),  
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),

        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9FA')]),
        
        ('ALIGN', (3, 1), (3, -1), 'LEFT'),
        ('ALIGN', (4, 1), (4, -1), 'LEFT'),
        
        ('LEFTPADDING', (3, 1), (4, -1), 6),
        ('RIGHTPADDING', (3, 1), (4, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    
    for i, inspection in enumerate(sorted(inspections, key=lambda x: x.date, reverse=True), 1):
        disease = inspection.disease_detected
        is_diseased = (disease and 
                      disease.lower().strip() not in ['none', '', 'healthy'] and
                      not disease.lower().startswith('✅'))
        
        if is_diseased:
            inspections_table.setStyle(TableStyle([
                ('BACKGROUND', (0, i), (-1, i), colors.HexColor('#FFEBEE')),
            ]))
    
    elements.append(inspections_table)
    elements.append(Spacer(1, 20))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        alignment=TA_CENTER,
        textColor=colors.grey,
    )
    
    footer = Paragraph(f"""
        <i>This report was automatically generated by BeeTrack Apiary Management System<br/>
        For more information, visit your BeeTrack dashboard</i>
    """, footer_style)
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=1, lineCap='round', color=colors.lightgrey))
    elements.append(Spacer(1, 10))
    elements.append(footer)
    
    doc.build(elements)
    
    log_event(f"Inspections PDF exported successfully: {len(inspections)} inspections to {path}")
    return path


def get_user_accessible_apiaries(db: Session, user: models.User) -> List[int]:
    if user.role == models.UserRole.admin:
        all_apiaries = db.query(models.Apiary.id).all()
        return [apiary.id for apiary in all_apiaries]
    
    memberships = db.query(models.ApiaryMember.apiary_id).filter(
        models.ApiaryMember.user_id == user.id,
        models.ApiaryMember.is_active == True
    ).all()
    
    return [membership.apiary_id for membership in memberships]


def validate_export_permissions(
    db: Session, 
    user: models.User, 
    requested_apiary_ids: Optional[List[int]] = None
) -> schemas.ExportPermissionCheck:
    
    accessible_apiary_ids = get_user_accessible_apiaries(db, user)
    
    if not accessible_apiary_ids:
        return schemas.ExportPermissionCheck(
            allowed=False,
            accessible_apiary_ids=[],
            error_message="No accessible apiaries found"
        )
    
    if requested_apiary_ids is None:
        return schemas.ExportPermissionCheck(
            allowed=True,
            accessible_apiary_ids=accessible_apiary_ids
        )
    
    unauthorized_apiaries = set(requested_apiary_ids) - set(accessible_apiary_ids)
    
    if unauthorized_apiaries:
        return schemas.ExportPermissionCheck(
            allowed=False,
            accessible_apiary_ids=accessible_apiary_ids,
            error_message=f"Access denied to apiaries: {list(unauthorized_apiaries)}"
        )
    
    return schemas.ExportPermissionCheck(
        allowed=True,
        accessible_apiary_ids=requested_apiary_ids
    )


def build_orders_query(db: Session, filter_params: schemas.OrderExportFilter, apiary_ids: Optional[List[int]], user_restriction: Optional[int]):
    
    query = db.query(models.Order)
    
    if filter_params.start_date:
        query = query.filter(models.Order.date >= filter_params.start_date)
    if filter_params.end_date:
        query = query.filter(models.Order.date <= filter_params.end_date)
    
    if user_restriction is not None:
        query = query.filter(models.Order.user_id == user_restriction)
    
    if filter_params.user_ids:
        query = query.filter(models.Order.user_id.in_(filter_params.user_ids))
    
    if filter_params.status_filter:
        query = query.filter(models.Order.status.in_(filter_params.status_filter))
    
    return query


def build_inspections_query(db: Session, filter_params: schemas.InspectionExportFilter, apiary_ids: List[int]):
    query = db.query(models.Inspection).join(models.Hive)
    
    if apiary_ids:
        query = query.filter(models.Hive.apiary_id.in_(apiary_ids))
    
    if filter_params.start_date:
        query = query.filter(models.Inspection.date >= filter_params.start_date)
    if filter_params.end_date:
        query = query.filter(models.Inspection.date <= filter_params.end_date)
    
    if filter_params.hive_ids:
        query = query.filter(models.Inspection.hive_id.in_(filter_params.hive_ids))
    
    if filter_params.temperature_min is not None:
        query = query.filter(models.Inspection.temperature >= filter_params.temperature_min)
    if filter_params.temperature_max is not None:
        query = query.filter(models.Inspection.temperature <= filter_params.temperature_max)
    
    if filter_params.disease_filter:
        disease_conditions = [
            models.Inspection.disease_detected.ilike(f"%{disease}%") 
            for disease in filter_params.disease_filter
        ]
        query = query.filter(or_(*disease_conditions))
    
    return query


def build_hives_query(db: Session, filter_params: schemas.HiveExportFilter, apiary_ids: List[int]):
    query = db.query(models.Hive)
    
    if apiary_ids:
        query = query.filter(models.Hive.apiary_id.in_(apiary_ids))
    
    if filter_params.status_filter:
        query = query.filter(models.Hive.status.in_(filter_params.status_filter))
    
    if filter_params.last_inspection_days is not None:
        cutoff_date = datetime.now() - timedelta(days=filter_params.last_inspection_days)
        query = query.filter(
            or_(
                models.Hive.last_inspection_date == None,
                models.Hive.last_inspection_date < cutoff_date
            )
        )
    
    return query


def export_orders_filtered(
    db: Session, 
    user: models.User,
    filter_params: schemas.OrderExportFilter,
    path: Optional[str] = None
) -> Optional[str]:
    if user.role != models.UserRole.admin:
        user_restriction = user.id
    else:
        user_restriction = None
    
    query = build_orders_query(db, filter_params, None, user_restriction)
    orders = query.all()
    
    if not orders:
        log_event(f"No orders found for filtered export by user {user.username}")
        return None
    
    if not path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        extension = "csv" if filter_params.format == schemas.ExportFormat.csv else "pdf"
        path = f"exports/orders_filtered_{timestamp}.{extension}"
    
    os.makedirs("exports", exist_ok=True)
    
    if filter_params.format == schemas.ExportFormat.csv:
        return _export_orders_to_csv_filtered(orders, path, user, filter_params)
    else:
        return _export_orders_to_pdf_filtered(orders, path, user, filter_params)


def _export_orders_to_csv_filtered(orders, path: str, user: models.User, filter_params: schemas.OrderExportFilter) -> str:
    user_timezone = filter_params.timezone or get_user_timezone(user)
    
    rows = []
    for order in orders:
        for item in order.items:
            rows.append({
                "Order ID": order.id,
                "User ID": order.user_id,
                "Date": format_date_for_user(order.date, user_timezone),
                "Status": order.status.title(),
                "Product ID": item.product_id,
                "Quantity": item.quantity,
                "Price Each": f"${item.price_each:.2f}",
                "Total": f"${item.quantity * item.price_each:.2f}"
            })
    
    df = pd.DataFrame(rows)
    df.to_csv(path, index=False)
    
    log_event(f"Filtered orders CSV exported by {user.username}: {len(orders)} orders, {len(rows)} items to {path}")
    return path


def _export_orders_to_pdf_filtered(orders, path: str, user: models.User, filter_params: schemas.OrderExportFilter) -> str:
    doc = SimpleDocTemplate(path, pagesize=A4, 
                          rightMargin=2*cm, leftMargin=2*cm,
                          topMargin=2*cm, bottomMargin=2*cm)
    
    user_timezone = filter_params.timezone or get_user_timezone(user)
    
    elements = []
    styles = getSampleStyleSheet()
    
    title = Paragraph(f"Orders Export - {user.username}", styles['Title'])
    elements.append(title)
    
    total_revenue = sum(sum(item.quantity * item.price_each for item in order.items) for order in orders)
    summary = Paragraph(f"""
        Generated: {format_datetime_for_user(datetime.now(timezone.utc), user_timezone)}<br/>
        Total Orders: {len(orders)}<br/>
        Total Revenue: ${total_revenue:.2f}
    """, styles['Normal'])
    elements.append(summary)
    elements.append(Spacer(1, 20))
    
    table_data = [['Order ID', 'Date', 'Status', 'Items', 'Total']]
    for order in sorted(orders, key=lambda x: x.date, reverse=True):
        order_total = sum(item.quantity * item.price_each for item in order.items)
        item_count = len(order.items)
        table_data.append([
            f'#{order.id}',
            format_date_for_user(order.date, user_timezone),
            order.status.title(),
            f'{item_count} items',
            f'${order_total:.2f}'
        ])
    
    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    log_event(f"Filtered orders PDF exported by {user.username}: {len(orders)} orders to {path}")
    return path


def export_inspections_filtered(
    db: Session,
    user: models.User, 
    filter_params: schemas.InspectionExportFilter,
    path: Optional[str] = None
) -> Optional[str]:
    
    permission_check = validate_export_permissions(db, user, filter_params.apiary_ids)
    if not permission_check.allowed:
        log_event(f"Inspection export denied for user {user.username}: {permission_check.error_message}")
        return None
    
    query = build_inspections_query(db, filter_params, permission_check.accessible_apiary_ids)
    inspections = query.all()
    
    if not inspections:
        log_event(f"No inspections found for filtered export by user {user.username}")
        return None
    
    if not path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        extension = "csv" if filter_params.format == schemas.ExportFormat.csv else "pdf"
        path = f"exports/inspections_filtered_{timestamp}.{extension}"
    
    os.makedirs("exports", exist_ok=True)
    
    if filter_params.format == schemas.ExportFormat.csv:
        return _export_inspections_to_csv_filtered(inspections, path, user, filter_params)
    else:
        return _export_inspections_to_pdf_filtered(inspections, path, user, filter_params)


def _export_inspections_to_csv_filtered(inspections, path: str, user: models.User, filter_params: schemas.InspectionExportFilter) -> str:
    user_timezone = filter_params.timezone or get_user_timezone(user)
    
    rows = []
    for inspection in inspections:
        rows.append({
            "Inspection ID": inspection.id,
            "Hive ID": inspection.hive_id,
            "Date": format_datetime_for_user(inspection.date, user_timezone),
            "Temperature": inspection.temperature if inspection.temperature else "N/A",
            "Disease Detected": inspection.disease_detected or "None",
            "Notes": inspection.notes or ""
        })
    
    df = pd.DataFrame(rows)
    df.to_csv(path, index=False)
    
    log_event(f"Filtered inspections CSV exported by {user.username}: {len(inspections)} inspections to {path}")
    return path


def _export_inspections_to_pdf_filtered(inspections, path: str, user: models.User, filter_params: schemas.InspectionExportFilter) -> str:
    doc = SimpleDocTemplate(path, pagesize=A4, 
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    user_timezone = filter_params.timezone or get_user_timezone(user)

    elements = []
    styles = getSampleStyleSheet()

    title = Paragraph(f"Inspections Export - {user.username}", styles['Title'])
    elements.append(title)

    total = len(inspections)
    avg_temp = sum(i.temperature for i in inspections if i.temperature) / total if total else 0
    summary = Paragraph(f"""
        Generated: {format_datetime_for_user(datetime.now(timezone.utc), user_timezone)}<br/>
        Total Inspections: {total}<br/>
        Average Temperature: {avg_temp:.1f}°C
    """, styles['Normal'])
    elements.append(summary)
    elements.append(Spacer(1, 20))

    table_data = [['Date', 'Hive ID', 'Temperature', 'Disease', 'Notes']]
    for i in sorted(inspections, key=lambda x: x.date, reverse=True):
        table_data.append([
            format_date_for_user(i.date, user_timezone),
            f'Hive #{i.hive_id}',
            f"{i.temperature}°C" if i.temperature is not None else 'N/A',
            (i.disease_detected or 'None').title(),
            (i.notes[:60] + '...') if i.notes and len(i.notes) > 60 else (i.notes or '')
        ])

    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey)
    ]))

    elements.append(table)
    doc.build(elements)

    log_event(f"Filtered inspections PDF exported by {user.username}: {len(inspections)} inspections to {path}")
    return path


def export_hives_filtered(
    db: Session,
    user: models.User,
    filter_params: schemas.HiveExportFilter, 
    path: Optional[str] = None
) -> Optional[str]:
    
    permission_check = validate_export_permissions(db, user, filter_params.apiary_ids)
    if not permission_check.allowed:
        log_event(f"Hive export denied for user {user.username}: {permission_check.error_message}")
        return None
    
    query = build_hives_query(db, filter_params, permission_check.accessible_apiary_ids)
    hives = query.all()
    
    if not hives:
        log_event(f"No hives found for filtered export by user {user.username}")
        return None
    
    if not path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        extension = "csv" if filter_params.format == schemas.ExportFormat.csv else "pdf"
        path = f"exports/hives_filtered_{timestamp}.{extension}"
    
    os.makedirs("exports", exist_ok=True)
    
    if filter_params.format == schemas.ExportFormat.csv:
        return _export_hives_to_csv_filtered(hives, path, user, filter_params)
    else:
        return _export_hives_to_pdf_filtered(hives, path, user, filter_params)


def _export_hives_to_csv_filtered(hives, path: str, user: models.User, filter_params: schemas.HiveExportFilter) -> str:
    user_timezone = filter_params.timezone or get_user_timezone(user)
    
    rows = []
    for hive in hives:
        rows.append({
            "Hive ID": hive.id,
            "Name": hive.name,
            "Apiary ID": hive.apiary_id,
            "Status": hive.status,
            "Last Inspection": format_date_for_user(hive.last_inspection_date, user_timezone) if hive.last_inspection_date else "Never"
        })
    
    df = pd.DataFrame(rows)
    df.to_csv(path, index=False)
    
    log_event(f"Filtered hives CSV exported by {user.username}: {len(hives)} hives to {path}")
    return path


def _export_hives_to_pdf_filtered(hives, path: str, user: models.User, filter_params: schemas.HiveExportFilter) -> str:
    doc = SimpleDocTemplate(path, pagesize=A4, 
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    user_timezone = filter_params.timezone or get_user_timezone(user)

    elements = []
    styles = getSampleStyleSheet()

    title = Paragraph(f"Hives Export - {user.username}", styles['Title'])
    elements.append(title)

    total = len(hives)
    active_count = sum(1 for h in hives if h.status == "active")
    summary = Paragraph(f"""
        Generated: {format_datetime_for_user(datetime.now(timezone.utc), user_timezone)}<br/>
        Total Hives: {total}<br/>
        Active Hives: {active_count}<br/>
        Inactive Hives: {total - active_count}
    """, styles['Normal'])
    elements.append(summary)
    elements.append(Spacer(1, 20))

    table_data = [['Hive ID', 'Name', 'Apiary ID', 'Status', 'Last Inspection']]
    for hive in sorted(hives, key=lambda x: x.id):
        table_data.append([
            f'#{hive.id}',
            hive.name,
            f'Apiary #{hive.apiary_id}' if hive.apiary_id else 'No Apiary',
            hive.status.title(),
            format_date_for_user(hive.last_inspection_date, user_timezone) if hive.last_inspection_date else 'Never'
        ])

    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    log_event(f"Filtered hives PDF exported by {user.username}: {len(hives)} hives to {path}")
    return path


def export_apiaries_filtered(
    db: Session,
    user: models.User,
    filter_params: schemas.ApiaryExportFilter,
    path: Optional[str] = None
) -> Optional[str]:
    
    accessible_apiary_ids = get_user_accessible_apiaries(db, user)
    
    if not accessible_apiary_ids:
        log_event(f"No accessible apiaries for export by user {user.username}")
        return None
    
    query = db.query(models.Apiary).filter(models.Apiary.id.in_(accessible_apiary_ids))
    
    if filter_params.owner_ids:
        query = query.filter(models.Apiary.owner_id.in_(filter_params.owner_ids))
    
    apiaries = query.all()
    
    if not apiaries:
        log_event(f"No apiaries found for filtered export by user {user.username}")
        return None
    
    if not path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        extension = "csv" if filter_params.format == schemas.ExportFormat.csv else "pdf"
        path = f"exports/apiaries_filtered_{timestamp}.{extension}"
    
    os.makedirs("exports", exist_ok=True)
    
    if filter_params.format == schemas.ExportFormat.csv:
        return _export_apiaries_to_csv_filtered(db, apiaries, path, user, filter_params)
    else:
        return _export_apiaries_to_pdf_filtered(db, apiaries, path, user, filter_params)


def _export_apiaries_to_csv_filtered(db: Session, apiaries, path: str, user: models.User, filter_params: schemas.ApiaryExportFilter) -> str:
    user_timezone = filter_params.timezone or get_user_timezone(user)
    
    rows = []
    for apiary in apiaries:
        row = {
            "Apiary ID": apiary.id,
            "Name": apiary.name,
            "Location": apiary.location or "",
            "Owner ID": apiary.owner_id,
            "Created At": format_date_for_user(apiary.created_at, user_timezone),
            "Description": apiary.description or ""
        }
        
        if filter_params.include_member_count:
            member_count = db.query(models.ApiaryMember).filter(
                models.ApiaryMember.apiary_id == apiary.id,
                models.ApiaryMember.is_active == True
            ).count()
            row["Member Count"] = member_count
        
        if filter_params.include_hive_count:
            hive_count = db.query(models.Hive).filter(models.Hive.apiary_id == apiary.id).count()
            row["Hive Count"] = hive_count
        
        rows.append(row)
    
    df = pd.DataFrame(rows)
    df.to_csv(path, index=False)
    
    log_event(f"Filtered apiaries CSV exported by {user.username}: {len(apiaries)} apiaries to {path}")
    return path


def _export_apiaries_to_pdf_filtered(db: Session, apiaries, path: str, user: models.User, filter_params: schemas.ApiaryExportFilter) -> str:
    doc = SimpleDocTemplate(path, pagesize=A4, 
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    user_timezone = filter_params.timezone or get_user_timezone(user)

    elements = []
    styles = getSampleStyleSheet()

    title = Paragraph(f"Apiaries Export - {user.username}", styles['Title'])
    elements.append(title)

    total = len(apiaries)
    total_hives = 0
    total_members = 0
    
    if filter_params.include_hive_count:
        total_hives = sum(db.query(models.Hive).filter(models.Hive.apiary_id == apiary.id).count() for apiary in apiaries)
    
    if filter_params.include_member_count:
        total_members = sum(db.query(models.ApiaryMember).filter(
            models.ApiaryMember.apiary_id == apiary.id,
            models.ApiaryMember.is_active == True
        ).count() for apiary in apiaries)
    
    summary = Paragraph(f"""
        Generated: {format_datetime_for_user(datetime.now(timezone.utc), user_timezone)}<br/>
        Total Apiaries: {total}<br/>
        Total Hives: {total_hives}<br/>
        Total Active Members: {total_members}
    """, styles['Normal'])
    elements.append(summary)
    elements.append(Spacer(1, 20))

    headers = ['Apiary ID', 'Name', 'Location', 'Owner', 'Created']
    if filter_params.include_member_count:
        headers.append('Members')
    if filter_params.include_hive_count:
        headers.append('Hives')
    
    table_data = [headers]
    
    for apiary in sorted(apiaries, key=lambda x: x.id):
        row = [
            f'#{apiary.id}',
            apiary.name,
            apiary.location or 'Not specified',
            f'User #{apiary.owner_id}',
            format_date_for_user(apiary.created_at, user_timezone)
        ]
        
        if filter_params.include_member_count:
            member_count = db.query(models.ApiaryMember).filter(
                models.ApiaryMember.apiary_id == apiary.id,
                models.ApiaryMember.is_active == True
            ).count()
            row.append(str(member_count))
        
        if filter_params.include_hive_count:
            hive_count = db.query(models.Hive).filter(models.Hive.apiary_id == apiary.id).count()
            row.append(str(hive_count))
        
        table_data.append(row)

    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    log_event(f"Filtered apiaries PDF exported by {user.username}: {len(apiaries)} apiaries to {path}")
    return path
