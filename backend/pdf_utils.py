from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import io
from datetime import datetime

class VerticalParagraph(Paragraph):
    def draw(self):
        self.canv.saveState()
        self.canv.translate(self.canv._x, self.canv._y)
        self.canv.rotate(90)
        # Adjust as needed for vertical alignment
        self.canv.drawString(0, 0, self.text)
        self.canv.restoreState()

def generate_routine_pdf(data):
    metadata = data.get('metadata', {})
    table_data = data.get('table', [])

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4),
                            topMargin=0.3*inch, bottomMargin=0.3*inch,
                            leftMargin=0.3*inch, rightMargin=0.3*inch)
    elements = []
    styles = getSampleStyleSheet()

    # Custom styles
    header_title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_CENTER,
        spaceAfter=2
    )
    class_title_style = ParagraphStyle(
        'ClassTitle',
        parent=styles['Normal'],
        fontSize=24,
        fontWeight='bold',
        alignment=TA_CENTER,
        spaceAfter=2
    )
    home_room_style = ParagraphStyle(
        'HomeRoom',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_RIGHT,
        spaceAfter=5
    )
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey
    )

    # Header
    elements.append(Paragraph(metadata.get('header_title', ''), header_title_style))
    elements.append(Paragraph(metadata.get('class_title', ''), class_title_style))
    if metadata.get('home_room'):
        elements.append(Paragraph(f"{metadata.get('home_room', '')}", home_room_style))
    else:
        elements.append(Spacer(1, 0.1*inch))

    # Table processing
    formatted_table = []

    # Pre-calculate column widths
    num_cols = len(table_data[0])
    avail_width = 11.1 * inch # Landscape A4 is 11.7, minus margins
    col_widths = [0.4*inch] + [(avail_width - 0.4*inch) / (num_cols - 1)] * (num_cols - 1)

    break_col_idx = -1
    for c_idx, cell in enumerate(table_data[0]):
        if 'break-cell' in cell.get('classes', []):
            break_col_idx = c_idx
            col_widths[c_idx] = 0.25*inch

    # Re-distribute widths if break column exists
    if break_col_idx != -1:
        other_cols_count = num_cols - 2 # Day col + break col
        rem_width = avail_width - 0.4*inch - 0.25*inch
        col_width = rem_width / other_cols_count
        for i in range(1, num_cols):
            if i != break_col_idx:
                col_widths[i] = col_width

    for r_idx, row in enumerate(table_data):
        formatted_row = []
        for c_idx, cell in enumerate(row):
            cell_text = cell.get('text', '')
            content = cell.get('content', [])
            is_break = 'break-cell' in cell.get('classes', [])
            is_day = 'day-label' in cell.get('classes', [])

            if content:
                subject = next((c['text'] for c in content if c['type'] == 'subject'), '')
                teacher = next((c['text'] for c in content if c['type'] == 'teacher'), '')
                room = next((c['text'] for c in content if c['type'] == 'room'), '')

                # Layout table for content: Subject center, Room bottom-left, Teacher bottom-right
                c_width = col_widths[c_idx] * cell.get('colspan', 1) - 4
                inner_data = [
                    [Paragraph(f"<b>{subject}</b>", ParagraphStyle('subj', alignment=TA_CENTER, fontSize=12))],
                    [Paragraph(f"<font size='7'>{room}</font>", ParagraphStyle('rm', alignment=TA_LEFT)),
                     Paragraph(f"<font size='7'>{teacher}</font>", ParagraphStyle('tr', alignment=TA_RIGHT))]
                ]
                inner_t = Table(inner_data, colWidths=[c_width/2, c_width/2])
                inner_t.setStyle(TableStyle([
                    ('SPAN', (0,0), (1,0)),
                    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 0),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                    ('BOTTOMPADDING', (0,0), (1,0), 10), # Space below subject
                ]))
                formatted_row.append(inner_t)
            elif is_break:
                # Vertical Break text is hard. Let's use multiple paragraphs or horizontal if it fits
                if r_idx == 0:
                    formatted_row.append(Paragraph("<b>Break</b>", ParagraphStyle('brk', alignment=TA_CENTER, fontSize=8)))
                else:
                    formatted_row.append("")
            elif is_day:
                formatted_row.append(Paragraph(f"<b>{cell_text}</b>", ParagraphStyle('day', alignment=TA_CENTER, fontSize=24)))
            else:
                # Header row or empty cells
                if r_idx == 0 and c_idx > 0:
                    parts = cell_text.split(' ')
                    label = parts[0] if parts else ""
                    time_val = " ".join(parts[1:]) if len(parts) > 1 else ""
                    formatted_row.append(Paragraph(f"<b>{label}</b><br/><font size='7'>{time_val}</font>", ParagraphStyle('hdr', alignment=TA_CENTER, fontSize=9)))
                else:
                    formatted_row.append(Paragraph(cell_text, ParagraphStyle('norm', alignment=TA_CENTER)))

        formatted_table.append(formatted_row)

    t = Table(formatted_table, colWidths=col_widths)

    t_style = [
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]

    # Handle spans and formatting
    for r_idx, row in enumerate(table_data):
        for c_idx, cell in enumerate(row):
            colspan = cell.get('colspan', 1)
            rowspan = cell.get('rowspan', 1)
            if colspan > 1 or rowspan > 1:
                t_style.append(('SPAN', (c_idx, r_idx), (c_idx + colspan - 1, r_idx + rowspan - 1)))

            if 'break-cell' in cell.get('classes', []):
                if r_idx == 0:
                    t_style.append(('SPAN', (c_idx, 0), (c_idx, len(table_data) - 1)))
                    t_style.append(('VALIGN', (c_idx, 0), (c_idx, len(table_data) - 1), 'MIDDLE'))

    t.setStyle(TableStyle(t_style))
    elements.append(t)

    # Footer
    elements.append(Spacer(1, 0.2*inch))
    footer_table_data = [[
        Paragraph(metadata.get('footer_left', ''), footer_style),
        Paragraph(metadata.get('footer_right', 'Cadence'), ParagraphStyle('footer_right', parent=footer_style, alignment=TA_RIGHT))
    ]]
    footer_table = Table(footer_table_data, colWidths=[avail_width/2, avail_width/2])
    footer_table.setStyle(TableStyle([
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(footer_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer
