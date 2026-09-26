import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  INK,
  MUTED,
  TEAL,
  drawTextRuns,
  lastTableY,
  num,
  pdfText,
  tealValue,
  type MpPdfDayTotal,
  type MpPdfEntry,
  type MpPdfMachineDayTotal,
} from "./records-pdf-helpers";
import {
  buildMachineSlotBody,
  resolveMachineDays,
} from "./records-pdf-tables";

export type {
  MpPdfDayTotal,
  MpPdfEntry,
  MpPdfMachineDayTotal,
} from "./records-pdf-helpers";

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

  const machineDays = resolveMachineDays({
    entries: opts.entries,
    machineDayWise: opts.machineDayWise,
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

  const body = buildMachineSlotBody(machineDays);

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
