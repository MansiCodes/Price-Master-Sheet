import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

export type MpPdfEntry = {
  entryDate: string;
  machineName: string;
  machineCode: string;
  shiftLabel: string;
  slotLabel: string;
  operatorName: string;
  currentProcess: string;
  cableType: string;
  cableSize: string;
  plannedProduction: number;
  actualProduction: number;
  efficiencyPct: number;
  status: string;
  operators?: number;
  helpers?: number;
  totalManpower?: number;
};

export type MpPdfDayTotal = {
  date: string;
  entries: number;
  plannedProduction: number;
  actualProduction: number;
  averageEfficiency: number;
};

export type MpPdfMachineDayTotal = {
  date: string;
  machineName: string;
  machineCode: string;
  entries: number;
  plannedProduction: number;
  actualProduction: number;
  efficiencyPct: number;
  slots?: MpPdfEntry[];
};

const TEAL: [number, number, number] = [13, 148, 136];
const TEAL_SOFT: [number, number, number] = [216, 243, 239];
const MUTED: [number, number, number] = [90, 107, 100];
const INK: [number, number, number] = [20, 30, 28];

function num(n: number): string {
  return Number(n).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

/** Helvetica in jsPDF mishandles many Unicode glyphs — keep PDF text ASCII-safe. */
function pdfText(value: string): string {
  return value
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2192\u2794]/g, "to")
    .replace(/[\u00B7\u2022\u2023]/g, "|")
    .replace(/\u00A0/g, " ");
}

function blackValue(text: string): CellDef {
  return {
    content: text,
    styles: {
      textColor: INK,
      fontStyle: "normal",
      halign: "right",
    },
  };
}

function tealValue(text: string): CellDef {
  return {
    content: text,
    styles: {
      textColor: TEAL,
      fontStyle: "bold",
      halign: "right",
    },
  };
}

function lastTableY(doc: jsPDF, fallback: number): number {
  return (
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? fallback
  );
}

/** Draw mixed-color runs left-to-right (Helvetica has poor Unicode coverage). */
function drawTextRuns(
  doc: jsPDF,
  x: number,
  y: number,
  runs: Array<{
    text: string;
    color: [number, number, number];
    bold?: boolean;
  }>,
) {
  let cursor = x;
  for (const run of runs) {
    doc.setFont("helvetica", run.bold ? "bold" : "normal");
    doc.setTextColor(...run.color);
    doc.text(run.text, cursor, y);
    cursor += doc.getTextWidth(run.text);
  }
}

/** Build a landscape PDF of machine-production admin records. */
export function buildMachineProductionRecordsPdf(opts: {
  dateFrom: string;
  dateTo: string;
  entries: MpPdfEntry[];
  dayWise: MpPdfDayTotal[];
  machineDayWise?: MpPdfMachineDayTotal[];
  plannedTotal: number;
  actualTotal: number;
}): { blob: Blob; filename: string } {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const generated = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `machine-production-${opts.dateFrom || stamp}-to-${opts.dateTo || stamp}.pdf`;

  // Prefer machine groups with nested slots; fall back to grouping flat entries.
  let machineDays = (opts.machineDayWise ?? []).map((m) => ({
    ...m,
    slots: m.slots?.length
      ? m.slots
      : opts.entries.filter(
          (e) =>
            e.entryDate === m.date &&
            e.machineName === m.machineName &&
            e.machineCode === m.machineCode,
        ),
  }));

  if (machineDays.length === 0 && opts.entries.length > 0) {
    const map = new Map<string, MpPdfMachineDayTotal & { slots: MpPdfEntry[] }>();
    for (const e of opts.entries) {
      const key = `${e.entryDate}|${e.machineCode}|${e.machineName}`;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          date: e.entryDate,
          machineName: e.machineName,
          machineCode: e.machineCode,
          entries: 1,
          plannedProduction: e.plannedProduction,
          actualProduction: e.actualProduction,
          efficiencyPct: e.efficiencyPct,
          slots: [e],
        });
      } else {
        cur.entries += 1;
        cur.plannedProduction += e.plannedProduction;
        cur.actualProduction += e.actualProduction;
        cur.slots.push(e);
      }
    }
    machineDays = [...map.values()].map((m) => ({
      ...m,
      plannedProduction: Math.round(m.plannedProduction * 100) / 100,
      actualProduction: Math.round(m.actualProduction * 100) / 100,
      efficiencyPct:
        m.plannedProduction > 0
          ? Math.round((m.actualProduction / m.plannedProduction) * 10000) / 100
          : 0,
    }));
  }

  machineDays = [...machineDays].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.machineName.localeCompare(b.machineName);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text("Atlanta Telecables - Machine Production Records", 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    pdfText(
      `Range ${opts.dateFrom || "-"} to ${opts.dateTo || "-"}  |  ${
        machineDays.length
      } machine-day(s)  |  Generated ${generated}`,
    ),
    14,
    20,
  );
  drawTextRuns(doc, 14, 25, [
    { text: "Total planned ", color: MUTED },
    { text: num(opts.plannedTotal), color: TEAL, bold: true },
    { text: "  |  Total actual ", color: MUTED },
    { text: num(opts.actualTotal), color: TEAL, bold: true },
  ]);
  doc.setTextColor(...INK);

  let y = 30;

  if (opts.dayWise.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text("Day-wise totals", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Date", "Entries", "Planned", "Actual", "Avg Eff %"]],
      body: opts.dayWise.map((d) => [
        d.date,
        tealValue(String(d.entries)),
        tealValue(num(d.plannedProduction)),
        tealValue(num(d.actualProduction)),
        tealValue(num(d.averageEfficiency)),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 1.6,
        valign: "middle",
        textColor: INK,
        lineColor: [220, 230, 228],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: TEAL,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left",
      },
      columnStyles: {
        0: { cellWidth: 32, halign: "left" },
        1: { cellWidth: 28, halign: "right" },
        2: { cellWidth: 40, halign: "right" },
        3: { cellWidth: 40, halign: "right" },
        4: { cellWidth: 32, halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "head" && data.column.index >= 1) {
          data.cell.styles.halign = "right";
        }
      },
      margin: { left: 14, right: 14 },
    });

    y = lastTableY(doc, y) + 8;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Machines with slot-wise details", 14, y);
  y += 2;

  const body: CellDef[][] = [];
  for (const m of machineDays) {
    const slots = [...(m.slots ?? [])].sort((a, b) => {
      if (a.shiftLabel !== b.shiftLabel) {
        return a.shiftLabel.localeCompare(b.shiftLabel);
      }
      return a.slotLabel.localeCompare(b.slotLabel);
    });

    body.push([
      {
        content: pdfText(
          `${m.date}  |  ${m.machineName}${
            m.machineCode ? ` (${m.machineCode})` : ""
          }`,
        ),
        colSpan: 5,
        styles: {
          fillColor: TEAL_SOFT,
          textColor: INK,
          fontStyle: "bold",
          halign: "left",
        },
      },
      {
        content: String(m.entries),
        styles: {
          fillColor: TEAL_SOFT,
          textColor: INK,
          fontStyle: "bold",
          halign: "right",
        },
      },
      {
        content: num(m.plannedProduction),
        styles: {
          fillColor: TEAL_SOFT,
          textColor: INK,
          fontStyle: "bold",
          halign: "right",
        },
      },
      {
        content: num(m.actualProduction),
        styles: {
          fillColor: TEAL_SOFT,
          textColor: INK,
          fontStyle: "bold",
          halign: "right",
        },
      },
      {
        content: `${num(m.efficiencyPct)}%`,
        styles: {
          fillColor: TEAL_SOFT,
          textColor: INK,
          fontStyle: "bold",
          halign: "right",
        },
      },
    ]);

    for (const e of slots) {
      body.push([
        {
          content: pdfText(e.shiftLabel),
          styles: { textColor: MUTED, fontSize: 7.5 },
        },
        {
          content: pdfText(e.slotLabel),
          styles: { textColor: INK, fontSize: 7.5 },
        },
        {
          content: pdfText(e.operatorName),
          styles: { textColor: INK, fontSize: 7.5 },
        },
        {
          content: pdfText(e.currentProcess),
          styles: { textColor: INK, fontSize: 7.5 },
        },
        {
          content: pdfText(`${e.cableType} / ${e.cableSize}`),
          styles: { textColor: MUTED, fontSize: 7.2 },
        },
        {
          content: pdfText(e.status),
          styles: { textColor: MUTED, fontSize: 7, halign: "center" },
        },
        blackValue(num(e.plannedProduction)),
        blackValue(num(e.actualProduction)),
        blackValue(`${num(e.efficiencyPct)}%`),
      ]);
    }

    body.push([
      {
        content: "Total",
        colSpan: 6,
        styles: {
          fontStyle: "bold",
          textColor: INK,
          halign: "right",
          fillColor: [245, 252, 251],
        },
      },
      {
        content: num(m.plannedProduction),
        styles: {
          fontStyle: "bold",
          textColor: TEAL,
          halign: "right",
          fillColor: [245, 252, 251],
        },
      },
      {
        content: num(m.actualProduction),
        styles: {
          fontStyle: "bold",
          textColor: TEAL,
          halign: "right",
          fillColor: [245, 252, 251],
        },
      },
      {
        content: `${num(m.efficiencyPct)}%`,
        styles: {
          fontStyle: "bold",
          textColor: TEAL,
          halign: "right",
          fillColor: [245, 252, 251],
        },
      },
    ]);
  }

  if (body.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No records for these filters.", 14, y + 6);
  } else {
    autoTable(doc, {
      startY: y,
      head: [[
        "Shift",
        "Slot",
        "Operator",
        "Process",
        "Cable",
        "Slots / Status",
        "Planned",
        "Actual",
        "Eff %",
      ]],
      body,
      styles: {
        fontSize: 7.5,
        cellPadding: 1.4,
        valign: "middle",
        textColor: INK,
        lineColor: [220, 230, 228],
        lineWidth: 0.1,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: TEAL,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 26 },
        2: { cellWidth: 32 },
        3: { cellWidth: 30 },
        4: { cellWidth: 42 },
        5: { cellWidth: 24, halign: "center" },
        6: { cellWidth: 28, halign: "right" },
        7: { cellWidth: 28, halign: "right" },
        8: { cellWidth: 22, halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "head" && data.column.index >= 6) {
          data.cell.styles.halign = "right";
        }
      },
      margin: { left: 14, right: 14 },
      rowPageBreak: "avoid",
    });
  }

  const buffer = doc.output("arraybuffer");
  const blob = new Blob([buffer], { type: "application/pdf" });
  return { blob, filename };
}
