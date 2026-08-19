import { jsPDF } from 'jspdf';
import { Cycle, DailyEntry } from '../types';

export function generateCamenPDF(cycle: Cycle, entries: Record<number, DailyEntry>) {
  if (!cycle || !cycle.start_date) {
    throw new Error('Dati del ciclo o data di inizio mancanti');
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const m = { top: 8, right: 10, bottom: 8, left: 10 };
  const contentWidth = pageWidth - m.left - m.right;

  const headerHeight = 24;
  const leftLabelWidth = 92;
  const gridWidth = contentWidth - leftLabelWidth;
  const numCols = 40;
  const colWidth = gridWidth / numCols;
  const gridStartX = m.left + leftLabelWidth;

  const chartStartY = m.top + headerHeight;
  const chartHeight = 68;
  const gridDataStartY = chartStartY + chartHeight + 4;
  const gridDataHeight = pageHeight - gridDataStartY - m.bottom;

  const minY = 36.0;
  const maxY = 37.5;
  const tempRange = maxY - minY;

  const cBlack = '#1A1A1A';
  const cDarkGrey = '#4A4A4A';
  const cLightGrey = '#D1D5DB';
  const cGridLine = '#E5E7EB';
  const cRed = '#DC2626';
  const cRedDark = '#991B1B';
  const cPrimary = '#BB7E62';

  const [sy, sm, sd] = cycle.start_date.split('-').map(Number);
  const cycleStartObj = new Date(sy, sm - 1, sd);

  const columnDates: { dateStr: string; dayOfMonth: string; cycleDay: number }[] = [];
  for (let i = 0; i < numCols; i++) {
    const cur = new Date(cycleStartObj.getTime());
    cur.setDate(cycleStartObj.getDate() + i);
    const yStr = cur.getFullYear();
    const mStr = String(cur.getMonth() + 1).padStart(2, '0');
    const dStr = String(cur.getDate()).padStart(2, '0');
    columnDates.push({
      dateStr: `${yStr}-${mStr}-${dStr}`,
      dayOfMonth: String(cur.getDate()),
      cycleDay: i + 1,
    });
  }

  let currentY = m.top;

  // 1. Header Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(cDarkGrey);
  doc.text('Associazione Sintotermico CAMEN', m.left, currentY + 3);

  doc.setFontSize(13);
  doc.setTextColor(cPrimary);
  doc.text('SCHEDA SINTOTERMICA', pageWidth / 2, currentY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(cDarkGrey);
  doc.text("Associazione La Bottega dell'Orefice\nwww.metodinaturali.it", pageWidth - m.right, currentY + 2, { align: 'right' });
  doc.text(`Codice Insegnante: ${cycle.teacher_code || 'N/D'}`, pageWidth - m.right, currentY + 12, { align: 'right' });

  currentY += 14;
  doc.setFontSize(8.5);
  doc.setTextColor(cBlack);
  doc.text(`Nome: ${cycle.name || 'N/D'}`, m.left, currentY);
  doc.text(`Num. Ciclo: ${cycle.cycle_number || '1'}`, m.left + 55, currentY);
  doc.text(`Mese/Anno: ${cycle.month_str || ''} ${cycle.year || ''}`, m.left + 90, currentY);
  doc.text(`Sigla: ${cycle.sigla || 'N/D'}`, m.left + 145, currentY);
  doc.text(`Protocollo: ${cycle.protocol_number || 'N/D'}`, m.left + 175, currentY);

  currentY += 3.5;
  doc.setDrawColor(cLightGrey);
  doc.setLineWidth(0.3);
  doc.line(m.left, currentY, pageWidth - m.right, currentY);

  // 2. Left Sidebar (BBT Method, Time, Shortest Cycle)
  let leftY = chartStartY + 3;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cBlack);
  doc.text('Temperatura Basale:', m.left, leftY);
  doc.setFont('helvetica', 'normal');

  const methods = ['Rettale', 'Vaginale', 'Orale'];
  const chkX = m.left + 30;
  methods.forEach((meth, idx) => {
    const yPos = leftY - 2.2 + idx * 5;
    doc.setDrawColor(cDarkGrey);
    doc.rect(chkX, yPos, 2.8, 2.8);
    doc.text(meth, chkX + 4.5, yPos + 2.3);
    if (cycle.bbt_method === meth) {
      doc.setFont('helvetica', 'bold');
      doc.text('X', chkX + 1.4, yPos + 2.2, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    }
  });

  leftY += 19;
  let firstTime = '--:--';
  for (let i = 1; i <= numCols; i++) {
    if (entries[i]?.bbt_time) {
      firstTime = entries[i].bbt_time as string;
      break;
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.text('Ora di rilevazione:', m.left, leftY);
  doc.setFont('helvetica', 'normal');
  doc.text(firstTime, m.left + 30, leftY);

  leftY += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Durata ciclo più breve (ultimi 12):', m.left, leftY);
  doc.setFont('helvetica', 'normal');
  doc.text(cycle.shortest_cycle ? `${cycle.shortest_cycle} giorni` : 'N/D', m.left + 48, leftY);

  // 3. BBT Chart Grid Lines & Points
  doc.setDrawColor(cGridLine);
  doc.setLineWidth(0.15);

  for (let i = 0; i <= numCols; i++) {
    const x = gridStartX + i * colWidth;
    doc.line(x, chartStartY, x, chartStartY + chartHeight);
  }

  const steps = 15;
  for (let i = 0; i <= steps; i++) {
    const tempVal = 37.5 - i * 0.1;
    const yPos = chartStartY + (i / steps) * chartHeight;

    if (Math.abs(tempVal - Math.round(tempVal)) < 0.01 || Math.abs(tempVal % 0.5) < 0.01) {
      doc.setDrawColor(cLightGrey);
      doc.setLineWidth(0.3);
    } else {
      doc.setDrawColor(cGridLine);
      doc.setLineWidth(0.15);
    }
    doc.line(gridStartX, yPos, gridStartX + gridWidth, yPos);

    doc.setFontSize(5.5);
    doc.setTextColor(cDarkGrey);
    const labelStr = tempVal.toFixed(1).replace('.', ',');
    doc.text(labelStr, gridStartX - 1.5, yPos + 0.7, { align: 'right' });
    doc.text(labelStr, gridStartX + gridWidth + 1.2, yPos + 0.7, { align: 'left' });
  }

  // Draw Connected Temperature Line
  doc.setDrawColor(cBlack);
  doc.setLineWidth(0.35);
  doc.setFillColor(cBlack);

  const points: { x: number; y: number }[] = [];

  columnDates.forEach((col, idx) => {
    const entry = entries[col.cycleDay];
    if (entry && entry.bbt && entry.bbt >= minY && entry.bbt <= maxY) {
      const x = gridStartX + idx * colWidth + colWidth / 2;
      const normalized = (maxY - entry.bbt) / tempRange;
      const y = chartStartY + normalized * chartHeight;
      points.push({ x, y });
    } else {
      points.push({ x: 0, y: 0 });
    }
  });

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (p1.x > 0 && p2.x > 0) {
      doc.line(p1.x, p1.y, p2.x, p2.y);
    }
  }

  points.forEach(p => {
    if (p.x > 0) {
      doc.circle(p.x, p.y, 0.7, 'FD');
    }
  });

  // Top Day of Month Numbers
  doc.setFontSize(6);
  doc.setTextColor(cBlack);
  columnDates.forEach((col, idx) => {
    const x = gridStartX + idx * colWidth + colWidth / 2;
    doc.text(col.dayOfMonth, x, chartStartY - 1.5, { align: 'center' });
  });

  // 4. Matrix Rows Definitions
  const rows = [
    {
      key: 'mest',
      label: 'Mestruazione / Perdite ematiche',
      height: 7.5,
      draw: (entry: DailyEntry, x: number, y: number, w: number, h: number) => {
        const m = entry.menstruation;
        if (m === 'Abbondante' || m === 'M+') {
          doc.setFillColor(cRedDark);
          doc.rect(x + 0.4, y + 0.8, w - 0.8, h - 1.6, 'F');
        } else if (m === 'Flusso' || m === 'M') {
          doc.setFillColor(cRed);
          doc.rect(x + 0.7, y + 1.2, w - 1.4, h - 2.4, 'F');
        } else if (m === 'Spotting' || m === 'm') {
          doc.setFillColor('#FCA5A5');
          doc.rect(x + 1.0, y + 1.8, w - 2.0, h - 3.6, 'F');
        }
      }
    },
    {
      key: 'day',
      label: 'Giorno del Ciclo',
      height: 6.5,
      draw: (entry: DailyEntry, x: number, y: number, w: number, _h: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(cBlack);
        doc.text(String(entry.cycle_day), x + w / 2, y + 4.2, { align: 'center' });
        doc.setFont('helvetica', 'normal');
      }
    },
    {
      key: 'sens',
      label: 'SENSAZIONE: Asciutto - Umido - Bagnato - Lubrificato (A, U, B, L)',
      height: 6.5,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.sensation) {
          doc.setFontSize(6);
          doc.setTextColor(cBlack);
          doc.text(entry.sensation, x + w / 2, y + 4.4, { align: 'center' });
        }
      }
    },
    {
      key: 'muco_q',
      label: 'MUCO: Quantità (+, -, +-, ++, /, *)',
      height: 6.5,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        const text = (entry.mucus_qty_symbol || entry.mucus_qty || '').trim();
        if (text) {
          doc.setFontSize(5.5);
          doc.setTextColor(cBlack);
          doc.text(text, x + w / 2, y + 4.4, { align: 'center' });
        }
      }
    },
    {
      key: 'muco_c',
      label: 'MUCO: Caratteristiche (O, T, A, F, D, E)',
      height: 6.5,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.mucus_char) {
          // Remove spaces/commas to keep text compact (e.g. 'OAD')
          const compact = entry.mucus_char.replace(/[\s,]+/g, '').toUpperCase();
          doc.setFontSize(4.8);
          doc.setTextColor(cBlack);
          doc.text(compact, x + w / 2, y + 4.3, { align: 'center' });
        }
      }
    },
    {
      key: 'cerv_cons',
      label: 'CERVICE: Consistenza (D, S)',
      height: 5.5,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.cervix_consistency) {
          doc.setFontSize(5.5);
          doc.setTextColor(cBlack);
          doc.text(entry.cervix_consistency, x + w / 2, y + 3.8, { align: 'center' });
        }
      }
    },
    {
      key: 'cerv_open',
      label: 'CERVICE: Apertura (C, S, A)',
      height: 5.5,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.cervix_opening) {
          doc.setFontSize(5.5);
          doc.setTextColor(cBlack);
          doc.text(entry.cervix_opening, x + w / 2, y + 3.8, { align: 'center' });
        }
      }
    },
    {
      key: 'cerv_pos',
      label: 'CERVICE: Posizione (B, M, A)',
      height: 5.5,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.cervix_position) {
          doc.setFontSize(5.5);
          doc.setTextColor(cBlack);
          doc.text(entry.cervix_position, x + w / 2, y + 3.8, { align: 'center' });
        }
      }
    },
    {
      key: 'coito',
      label: 'COITO: Completo (X) Interr. (I) s/eiac. (O) c/pres. (P)',
      height: 6.5,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.intercourse) {
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(cBlack);
          doc.text(entry.intercourse, x + w / 2, y + 4.4, { align: 'center' });
          doc.setFont('helvetica', 'normal');
        }
      }
    },
    {
      key: 'note',
      label: 'NOTE',
      height: 28,
      draw: (entry: DailyEntry, x: number, y: number, w: number, h: number) => {
        if (entry.notes) {
          doc.setFontSize(4.8);
          doc.setTextColor(cBlack);
          // Truncate note if too long to prevent overflowing column height
          let noteText = entry.notes.trim();
          if (noteText.length > 32) {
            noteText = noteText.substring(0, 31) + '…';
          }
          // Render vertically rotated 90 degrees inside the column
          doc.text(noteText, x + w / 2 + 0.8, y + 2.5, { angle: 90 });
        }
      }
    }
  ];

  const totalGridH = rows.reduce((s, r) => s + r.height, 0);

  let rowY = gridDataStartY;
  doc.setDrawColor(cLightGrey);
  doc.setLineWidth(0.2);

  // Outer Grid Box
  doc.line(m.left, gridDataStartY, pageWidth - m.right, gridDataStartY);
  doc.line(m.left, gridDataStartY + totalGridH, pageWidth - m.right, gridDataStartY + totalGridH);
  doc.line(m.left, gridDataStartY, m.left, gridDataStartY + totalGridH);
  doc.line(gridStartX, gridDataStartY, gridStartX, gridDataStartY + totalGridH);
  doc.line(pageWidth - m.right, gridDataStartY, pageWidth - m.right, gridDataStartY + totalGridH);

  // Vertical Column Dividers
  for (let i = 0; i <= numCols; i++) {
    const x = gridStartX + i * colWidth;
    doc.line(x, gridDataStartY, x, gridDataStartY + totalGridH);
  }

  // Draw Row Labels and Horizontal Lines
  rows.forEach(r => {
    doc.setFontSize(6);
    doc.setTextColor(cBlack);
    doc.text(r.label, m.left + 2, rowY + (r.key === 'note' ? 4.5 : r.height / 2 + 1.2), {
      maxWidth: leftLabelWidth - 4,
    });
    doc.line(m.left, rowY + r.height, pageWidth - m.right, rowY + r.height);
    rowY += r.height;
  });

  // Draw Cell Contents
  rowY = gridDataStartY;
  rows.forEach(r => {
    columnDates.forEach((col, colIdx) => {
      const entry = entries[col.cycleDay];
      const cellX = gridStartX + colIdx * colWidth;
      if (entry && r.draw) {
        r.draw(entry, cellX, rowY, colWidth, r.height);
      }
    });
    rowY += r.height;
  });

  const safeName = (cycle.name || 'utente').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const cycleNum = String(cycle.cycle_number || 1).padStart(2, '0');
  const filename = `scheda_sintotermica_${cycle.year || '2026'}_ciclo_${cycleNum}_${safeName}.pdf`;

  doc.save(filename);
}
