export function generatePrintHTML(data) {
  if (!data || !data.table) return '';

  const { metadata, table } = data;

  const css = `
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: white; color: black; }
      .header-title { text-align: center; font-size: 14pt; margin-top: 5mm; }
      .class-title { text-align: center; font-size: 36pt; font-weight: bold; margin-bottom: 2mm; }
      .home-room { text-align: right; font-size: 12pt; margin-right: 5mm; margin-bottom: 2mm; font-weight: bold; }
      .timetable { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .timetable th, .timetable td { border: 1px solid black; text-align: center; vertical-align: middle; padding: 4px; height: 80px; position: relative; }
      .timetable th { height: auto; background-color: #f8f8f8; }
      .day-label { font-size: 24pt; font-weight: bold; width: 80px; }
      .period-header { font-size: 12pt; font-weight: bold; }
      .time-header { font-size: 9pt; font-weight: normal; }
      .subject-id { font-size: 16pt; font-weight: 800; display: block; margin-bottom: 2mm; }
      .teacher-id { font-size: 9pt; font-weight: 600; position: absolute; bottom: 4px; right: 4px; }
      .room-info { font-size: 9pt; font-weight: 600; position: absolute; bottom: 4px; left: 4px; }
      .break-cell { font-size: 12pt; font-weight: bold; width: 35px; background-color: #f9f9f9; }
      .footer { margin-top: 8mm; font-size: 10pt; font-weight: bold; border-top: 1px solid #eee; padding-top: 2mm; }
      .footer-left { float: left; margin-left: 5mm; }
      .footer-right { float: right; margin-right: 5mm; }
      .clearfix::after { content: ""; clear: both; display: table; }

      /* Vertical text for break */
      .break-text {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        white-space: nowrap;
      }
    </style>
  `;

  let html = `<html><head><title>Print Routine</title>${css}</head><body>`;
  html += `<div class='header-title'>${metadata?.header_title || ''}</div>`;
  html += `<div class='class-title'>${metadata?.class_title || 'Routine'}</div>`;

  if (metadata?.home_room) {
    html += `<div class='home-room'>${metadata.home_room}</div>`;
  }

  html += "<table class='timetable'>";

  // Header Row
  const headerRow = table[0];
  html += "<tr>";
  headerRow.forEach((cell, idx) => {
    const isBreak = cell.classes.includes('break-cell');
    if (idx === 0) {
      html += "<th></th>";
    } else if (isBreak) {
      const parts = cell.text.split(' ');
      const label = parts[0];
      const time = parts.slice(1).join(' ');
      html += `<th rowspan='${table.length}' class='break-cell'>
                <div class='break-text'>
                  ${label} <br> ${time}
                </div>
              </th>`;
    } else {
      const parts = cell.text.split(' ');
      const label = parts[0];
      const time = parts.slice(1).join(' ');
      html += `<th>
                <div class='period-header'>${label}</div>
                <div class='time-header'>${time}</div>
              </th>`;
    }
  });
  html += "</tr>";

  // Data Rows
  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    html += "<tr>";
    row.forEach((cell, cidx) => {
      const isDay = cell.classes.includes('day-label');
      const isBreak = cell.classes.includes('break-cell');

      if (isDay) {
        html += `<td class='day-label'>${cell.text}</td>`;
      } else if (isBreak) {
        // Skip as it's handled by rowspan in header
        return;
      } else {
        const subject = cell.content.find(c => c.type === 'subject')?.text;
        const teacher = cell.content.find(c => c.type === 'teacher')?.text;
        const room = cell.content.find(c => c.type === 'room')?.text;

        if (subject) {
          html += `<td colspan='${cell.colspan}'>`;
          html += `<span class='subject-id'>${subject}</span>`;
          if (teacher) html += `<div class='teacher-id'>${teacher}</div>`;
          if (room) html += `<div class='room-info'>${room}</div>`;
          html += "</td>";
        } else {
          html += `<td colspan='${cell.colspan}'></td>`;
        }
      }
    });
    html += "</tr>";
  }

  html += "</table>";

  // Footer
  html += `<div class='footer clearfix'>`;
  html += `<div class='footer-left'>${metadata?.footer_left || `Generated: ${new Date().toLocaleDateString()}`}</div>`;
  html += `<div class='footer-right'>${metadata?.footer_right || 'Cadence'}</div>`;
  html += `</div>`;

  html += "</body></html>";
  return html;
}
