import { jsPDF } from 'jspdf';
import { Cycle, DailyEntry } from '../types';

export function generateCamenPDF(cycle: Cycle, entries: Record<number, DailyEntry>) {
  if (!cycle || !cycle.start_date) {
    throw new Error('Dati del ciclo o data di inizio mancanti');
  }

  // Landscape A4: 297mm x 210mm
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const m = { top: 10, right: 12, bottom: 10, left: 12 };
  const contentWidth = pageWidth - m.left - m.right;

  const headerHeight = 28;
  const leftLabelWidth = 92;
  const gridWidth = contentWidth - leftLabelWidth;
  const numCols = 40;
  const colWidth = gridWidth / numCols;
  const gridStartX = m.left + leftLabelWidth;

  const chartStartY = m.top + headerHeight;
  const chartHeight = 72;
  const gridDataStartY = chartStartY + chartHeight + 4;
  const gridDataHeight = pageHeight - gridDataStartY - m.bottom;

  // Chart Y-Axis Scale
  const minY = 36.0;
  const maxY = 37.5;
  const tempRange = maxY - minY;

  // Colors
  const cBlack = '#1A1A1A';
  const cDarkGrey = '#4A4A4A';
  const cLightGrey = '#D1D5DB';
  const cGridLine = '#E5E7EB';
  const cRed = '#DC2626';
  const cPrimary = '#BB7E62';

  // Helper date maps
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

  // 1. Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(cDarkGrey);
  doc.text('Associazione Sintotermico CAMEN', m.left, currentY + 3);

  doc.setFontSize(14);
  doc.setTextColor(cPrimary);
  doc.text('SCHEDA SINTOTERMICA', pageWidth / 2, currentY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(cDarkGrey);
  doc.text("Associazione La Bottega dell'Orefice\nwww.metodinaturali.it", pageWidth - m.right, currentY + 2, { align: 'right' });
  doc.text(`Codice Insegnante: ${cycle.teacher_code || 'N/D'}`, pageWidth - m.right, currentY + 13, { align: 'right' });

  currentY += 16;
  doc.setFontSize(9);
  doc.setTextColor(cBlack);
  doc.text(`Nome: ${cycle.name || 'N/D'}`, m.left, currentY);
  doc.text(`Num. Ciclo: ${cycle.cycle_number || '1'}`, m.left + 55, currentY);
  doc.text(`Mese/Anno: ${cycle.month_str || ''} ${cycle.year || ''}`, m.left + 90, currentY);
  doc.text(`Sigla: ${cycle.sigla || 'N/D'}`, m.left + 145, currentY);
  doc.text(`Protocollo: ${cycle.protocol_number || 'N/D'}`, m.left + 175, currentY);

  currentY += 4;
  doc.setDrawColor(cLightGrey);
  doc.setLineWidth(0.3);
  doc.line(m.left, currentY, pageWidth - m.right, currentY);

  // 2. Left Sidebar
  let leftY = chartStartY + 3;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cBlack);
  doc.text('Temperatura Basale:', m.left, leftY);
  doc.setFont('helvetica', 'normal');

  const methods = ['Rettale', 'Vaginale', 'Orale'];
  let chkX = m.left + 32;
  methods.forEach((meth, idx) => {
    const yPos = leftY - 2.5 + idx * 5.5;
    doc.setDrawColor(cDarkGrey);
    doc.rect(chkX, yPos, 3, 3);
    doc.text(meth, chkX + 5, yPos + 2.5);
    if (cycle.bbt_method === meth) {
      doc.setFont('helvetica', 'bold');
      doc.text('X', chkX + 1.5, yPos + 2.4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
    }
  });

  leftY += 22;
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
  doc.text(firstTime, m.left + 32, leftY);

  leftY += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Durata ciclo più breve (ultimi 12):', m.left, leftY);
  doc.setFont('helvetica', 'normal');
  doc.text(cycle.shortest_cycle ? `${cycle.shortest_cycle} giorni` : 'N/D', m.left + 52, leftY);

  // 3. BBT Chart Grid & Vector Plotting
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

    doc.setFontSize(6);
    doc.setTextColor(cDarkGrey);
    const labelStr = tempVal.toFixed(1).replace('.', ',');
    doc.text(labelStr, gridStartX - 2, yPos + 0.8, { align: 'right' });
    doc.text(labelStr, gridStartX + gridWidth + 1.5, yPos + 0.8, { align: 'left' });
  }

  // Plot Chart Points and Lines
  doc.setDrawColor(cBlack);
  doc.setLineWidth(0.4);
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
      doc.circle(p.x, p.y, 0.8, 'FD');
    }
  });

  doc.setFontSize(6.5);
  doc.setTextColor(cBlack);
  columnDates.forEach((col, idx) => {
    const x = gridStartX + idx * colWidth + colWidth / 2;
    doc.text(col.dayOfMonth, x, chartStartY - 1.5, { align: 'center' });
  });

  // 4. Symptothermal Data Grid Rows
  const rows = [
    {
      key: 'mest',
      label: 'Mestruazione / Perdite ematiche',
      height: gridDataHeight * 0.11,
      draw: (entry: DailyEntry, x: number, y: number, w: number, h: number) => {
        if (entry.menstruation === 'M') {
          doc.setFillColor(cRed);
          doc.rect(x + 0.15 * w, y + 0.15 * h, w * 0.7, h * 0.7, 'F');
        } else if (entry.menstruation === 'm') {
          doc.setFillColor('#FCA5A5');
          doc.rect(x + 0.25 * w, y + 0.25 * h, w * 0.5, h * 0.5, 'F');
        }
      }
    },
    {
      key: 'day',
      label: 'Giorno del Ciclo',
      height: gridDataHeight * 0.08,
      draw: (entry: DailyEntry, x: number, y: number, w: number, _h: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(cBlack);
        doc.text(String(entry.cycle_day), x + w / 2, y + 2.5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
      }
    },
    {
      key: 'sens',
      label: 'SENSAZIONE: Asciutto - Umido - Bagnato - Lubrificato',
      height: gridDataHeight * 0.09,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.sensation) {
          doc.setFontSize(6.5);
          doc.text(entry.sensation, x + w / 2, y + 2.6, { align: 'center' });
        }
      }
    },
    {
      key: 'muco_q',
      label: 'MUCO: Quantità (+, -, /, *)',
      height: gridDataHeight * 0.08,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        const text = entry.mucus_qty_symbol || entry.mucus_qty || '';
        if (text) {
          doc.setFontSize(6);
          doc.text(text.substring(0, 3), x + w / 2, y + 2.4, { align: 'center' });
        }
      }
    },
    {
      key: 'muco_c',
      label: 'MUCO: Caratteristiche (O, T, A, F, D, E)',
      height: gridDataHeight * 0.08,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.mucus_char) {
          doc.setFontSize(5.5);
          doc.text(entry.mucus_char.substring(0, 4), x + w / 2, y + 2.4, { align: 'center' });
        }
      }
    },
    {
      key: 'cerv_cons',
      label: 'CERVICE: Consistenza (D, S)',
      height: gridDataHeight * 0.08,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.cervix_consistency) {
          doc.setFontSize(6);
          doc.text(entry.cervix_consistency, x + w / 2, y + 2.4, { align: 'center' });
        }
      }
    },
    {
      key: 'cerv_open',
      label: 'CERVICE: Apertura (C, S, A)',
      height: gridDataHeight * 0.08,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.cervix_opening) {
          doc.setFontSize(6);
          doc.text(entry.cervix_opening, x + w / 2, y + 2.4, { align: 'center' });
        }
      }
    },
    {
      key: 'cerv_pos',
      label: 'CERVICE: Posizione (B, M, A)',
      height: gridDataHeight * 0.08,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.cervix_position) {
          doc.setFontSize(6);
          doc.text(entry.cervix_position, x + w / 2, y + 2.4, { align: 'center' });
        }
      }
    },
    {
      key: 'coito',
      label: 'COITO: Completo (X) Interr. (I) s/eiac. (O) c/pres. (P)',
      height: gridDataHeight * 0.14,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.intercourse) {
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.text(entry.intercourse, x + w / 2, y + 3, { align: 'center' });
          doc.setFont('helvetica', 'normal');
        }
      }
    },
    {
      key: 'note',
      label: 'NOTE',
      height: gridDataHeight * 0.18,
      draw: (entry: DailyEntry, x: number, y: number, w: number) => {
        if (entry.notes) {
          doc.setFontSize(4.5);
          const shortNote = entry.notes.length > 10 ? entry.notes.substring(0, 9) + '…' : entry.notes;
          doc.text(shortNote, x + w / 2, y + 2.5, { align: 'center' });
        }
      }
    }
  ];

  const totalGridH = rows.reduce((s, r) => s + r.height, 0);

  let rowY = gridDataStartY;
  doc.setDrawColor(cLightGrey);
  doc.setLineWidth(0.2);

  doc.line(m.left, gridDataStartY, pageWidth - m.right, gridDataStartY);
  doc.line(m.left, gridDataStartY + totalGridH, pageWidth - m.right, gridDataStartY + totalGridH);

  doc.line(m.left, gridDataStartY, m.left, gridDataStartY + totalGridH);
  doc.line(gridStartX, gridDataStartY, gridStartX, gridDataStartY + totalGridH);
  doc.line(pageWidth - m.right, gridDataStartY, pageWidth - m.right, gridDataStartY + totalGridH);

  for (let i = 0; i <= numCols; i++) {
    const x = gridStartX + i * colWidth;
    doc.line(x, gridDataStartY, x, gridDataStartY + totalGridH);
  }

  rows.forEach(r => {
    doc.setFontSize(6.5);
    doc.setTextColor(cBlack);
    doc.text(r.label, m.left + 2, rowY + 2.8, { maxWidth: leftLabelWidth - 4 });
    doc.line(m.left, rowY + r.height, pageWidth - m.right, rowY + r.height);
    rowY += r.height;
  });

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
