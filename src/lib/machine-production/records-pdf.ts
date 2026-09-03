import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type MpPdfEntry = {
  entryDate: string;
  machineName: string;
  machineCode: string;
  shiftLabel: string;
  slotLabel: string;
  supervisor: string;
  currentProcess: string;
  cableType: string;
  cableSize: string;
  plannedProduction: number;
  actualProduction: number;
  efficiencyPct: number;
  status: string;
};

export type MpPdfDayTotal = {
  date: string;
  entries: number;
  plannedProduction: number;
  actualProduction: number;
  averageEfficiency: number;
};

function num(n: number): string {
  return Number(n).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

/** Build a landscape PDF of machine-production admin records. */
export function buildMachineProductionRecordsPdf(opts: {
  dateFrom: string;
  dateTo: string;
  entries: MpPdfEntry[];
  dayWise: MpPdfDayTotal[];
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Atlanta Telecables — Machine Production Records", 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 107, 100);
  doc.text(
    `Range ${opts.dateFrom || "—"} → ${opts.dateTo || "—"} · ${opts.entries.length} row(s) · Generated ${generated}`,
    14,
    20,
  );
  doc.text(
    `Total planned ${num(opts.plannedTotal)} · Total actual ${num(opts.actualTotal)}`,
    14,
    25,
  );
  doc.setTextColor(0, 0, 0);

  let y = 30;

  if (opts.dayWise.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Day-wise totals", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Date", "Entries", "Planned", "Actual", "Avg Eff %"]],
      body: opts.dayWise.map((d) => [
        d.date,
        String(d.entries),
        num(d.plannedProduction),
        num(d.actualProduction),
        num(d.averageEfficiency),
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 118, 110] },
      margin: { left: 14, right: 14 },
    });

    y =
      ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? y) + 8;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Production entries", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [[
      "Date",
      "Machine",
      "Shift",
      "Slot",
      "Supervisor",
      "Process",
      "Cable",
      "Planned",
      "Actual",
      "Eff %",
    ]],
    body: opts.entries.map((e) => [
      e.entryDate,
      `${e.machineName}\n${e.machineCode}`,
      e.shiftLabel,
      e.slotLabel,
      e.supervisor,
      e.currentProcess,
      `${e.cableType}\n${e.cableSize}`,
      num(e.plannedProduction),
      num(e.actualProduction),
      num(e.efficiencyPct),
    ]),
    styles: { fontSize: 7.5, cellPadding: 1.2, valign: "top" },
    headStyles: { fillColor: [15, 118, 110] },
    columnStyles: {
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  const buffer = doc.output("arraybuffer");
  const blob = new Blob([buffer], { type: "application/pdf" });
  return { blob, filename };
}
