from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import io

def generate_routine_pdf(data):
    metadata = data.get('metadata', {})
    table_data = data.get('table', [])

    buffer = io.BytesIO()
    # Narrower margins to match the reference image
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4),
                            topMargin=0.4*inch, bottomMargin=0.4*inch,
                            leftMargin=0.4*inch, rightMargin=0.4*inch)
    elements = []
    styles = getSampleStyleSheet()

    # Custom styles
    header_title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Normal'],
        fontSize=12,
        alignment=TA_CENTER,
        spaceAfter=2
    )
    class_title_style = ParagraphStyle(
        'ClassTitle',
        parent=styles['Normal'],
        fontSize=42, # Large title
        fontWeight='bold',
        alignment=TA_CENTER,
        spaceAfter=10
    )
    home_room_style = ParagraphStyle(
        'HomeRoom',
        parent=styles['Normal'],
        fontSize=11,
        alignment=TA_RIGHT,
        spaceAfter=5
    )
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.black
    )

    # Header
    elements.append(Paragraph(metadata.get('header_title', ''), header_title_style))
    elements.append(Paragraph(metadata.get('class_title', ''), class_title_style))
    if metadata.get('home_room'):
        elements.append(Paragraph(f"<b>{metadata.get('home_room', '')}</b>", home_room_style))
    else:
        elements.append(Spacer(1, 0.1*inch))

    # Table processing
    formatted_table = []

    # Pre-calculate column widths
    num_cols = len(table_data[0])
    avail_width = 10.9 * inch # Landscape A4 is 11.69, minus margins (~0.8)

    # Identify column indices
    break_col_idx = -1
    for c_idx, cell in enumerate(table_data[0]):
        if 'break-cell' in cell.get('classes', []):
            break_col_idx = c_idx
            break

    # Re-calculate widths
    # Day col (~0.8 inch), Break col (~0.35 inch)
    day_width = 0.8 * inch
    break_width = 0.35 * inch
    other_cols_count = num_cols - (2 if break_col_idx != -1 else 1)
    rem_width = avail_width - day_width - (break_width if break_col_idx != -1 else 0)
    std_col_width = rem_width / other_cols_count

    col_widths = [day_width]
    for i in range(1, num_cols):
        if i == break_col_idx:
            col_widths.append(break_width)
        else:
            col_widths.append(std_col_width)

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

                # Calculate available width for inner table
                colspan = cell.get('colspan', 1)
                actual_width = sum(col_widths[c_idx : c_idx + colspan]) - 4

                # Layout table for content: Subject center (top), Room bottom-left, Teacher bottom-right
                inner_data = [
                    [Paragraph(f"<b>{subject}</b>", ParagraphStyle('subj', alignment=TA_CENTER, fontSize=13, leading=14))],
                    [Paragraph(f"<font size='8'>{room}</font>", ParagraphStyle('rm', alignment=TA_LEFT, leftIndent=2, leading=9)),
                     Paragraph(f"<font size='8'>{teacher}</font>", ParagraphStyle('tr', alignment=TA_RIGHT, rightIndent=2, leading=9))]
                ]
                inner_t = Table(inner_data, colWidths=[actual_width/2, actual_width/2], rowHeights=[38, 12])
                inner_t.setStyle(TableStyle([
                    ('SPAN', (0,0), (1,0)),
                    ('VALIGN', (0,0), (1,0), 'MIDDLE'),
                    ('VALIGN', (0,1), (1,1), 'BOTTOM'),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 0),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                ]))
                formatted_row.append(inner_t)
            elif is_break:
                formatted_row.append("") # Placeholder
            elif is_day:
                formatted_row.append(Paragraph(f"<b>{cell_text}</b>", ParagraphStyle('day', alignment=TA_CENTER, fontSize=38)))
            else:
                # Header row or empty cells
                if r_idx == 0 and c_idx > 0:
                    parts = cell_text.split(' ')
                    label = parts[0] if parts else ""
                    time_val = " ".join(parts[1:]) if len(parts) > 1 else ""
                    formatted_row.append(Paragraph(f"<b>{label}</b><br/><font size='7'>{time_val}</font>", ParagraphStyle('hdr', alignment=TA_CENTER, fontSize=10, leading=11)))
                else:
                    formatted_row.append(Paragraph(cell_text, ParagraphStyle('norm', alignment=TA_CENTER)))

        formatted_table.append(formatted_row)

    # Post-process break cell content
    if break_col_idx != -1:
        break_cell_text = table_data[0][break_col_idx].get('text', '')
        break_label = break_cell_text.split(' ')[0]
        break_time = " ".join(break_cell_text.split(' ')[1:])

        # Vertical stack for "Break"
        v_break = "<br/>".join(list(break_label))
        break_content = Paragraph(f"<b>{v_break}</b><br/><br/><font size='7'>{break_time}</font>",
                                  ParagraphStyle('brk', alignment=TA_CENTER, leading=14))
        # Place it in the first data row (under header)
        if len(formatted_table) > 1:
            formatted_table[1][break_col_idx] = break_content

    t = Table(formatted_table, colWidths=col_widths, rowHeights=[40] + [55]*(len(formatted_table)-1))

    t_style = [
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 1),
        ('RIGHTPADDING', (0, 0), (-1, -1), 1),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]

    # Handle spans and formatting
    for r_idx, row in enumerate(table_data):
        for c_idx, cell in enumerate(row):
            colspan = cell.get('colspan', 1)
            rowspan = cell.get('rowspan', 1)
            if (colspan > 1 or rowspan > 1) and not 'break-cell' in cell.get('classes', []):
                t_style.append(('SPAN', (c_idx, r_idx), (c_idx + colspan - 1, r_idx + rowspan - 1)))

            if 'break-cell' in cell.get('classes', []):
                if r_idx == 0:
                    t_style.append(('SPAN', (c_idx, 1), (c_idx, len(table_data) - 1)))
                    t_style.append(('VALIGN', (c_idx, 1), (c_idx, len(table_data) - 1), 'MIDDLE'))

    t.setStyle(TableStyle(t_style))
    elements.append(t)

    # Footer
    elements.append(Spacer(1, 0.3*inch))
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
