import os
import pandas as pd
from sqlalchemy.orm import Session
from app import models
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
from datetime import datetime

UNICODE_FONT = 'Helvetica'
log_event("Using standard Helvetica font for PDF generation")


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
        """
        Convert disease status to display format with appropriate symbols
        """
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
