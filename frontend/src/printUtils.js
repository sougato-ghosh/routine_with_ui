export function generatePrintHTML(data) {
  if (!data || !data.table) return '';

  const { metadata, table } = data;

  const css = `
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: Arial, sans-serif; }
        .timetable { border-collapse: collapse; width: 100%; table-layout: fixed; }
        .timetable th, .timetable td { border: 1px solid black; padding: 5px; text-align: center; vertical-align: middle; height: 80px; position: relative; }
        .period-header { font-size: 14px; font-weight: bold; }
        .time-header { font-size: 10px; font-weight: normal; }
        .day-label { font-size: 40px; font-weight: normal; width: 80px; }
        .subject-id { font-size: 18px; font-weight: normal; display: block; margin-bottom: 5px; }
        .teacher-id { font-size: 10px; position: absolute; bottom: 5px; right: 5px; }
        .room-info { font-size: 10px; position: absolute; bottom: 5px; left: 5px; }
        .break-cell { width: 40px; }
        .home-room { text-align: right; font-size: 14px; margin-bottom: 5px; }
        .header-title { text-align: center; margin-bottom: 0; }
        .class-title { text-align: center; font-size: 48px; margin-top: 0; margin-bottom: 10px; }
        .footer { width: 100%; margin-top: 20px; font-size: 12px; }
        .footer-left { float: left; }
        .footer-right { float: right; }
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
