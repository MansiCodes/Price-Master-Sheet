import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { CableRate } from "@/lib/sheets/types";

function formatPrice(value: number): string {
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Build a landscape PDF of the selected price-sheet rows. */
export function buildPriceSheetPdf(rows: CableRate[]): {
  buffer: Buffer;
  filename: string;
} {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `atlanta-telecables-price-sheet-${stamp}.pdf`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Atlanta Telecables — Price Sheet", 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 107, 100);
  doc.text(`${rows.length} item(s) · ${dateLabel}`, 14, 20);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 24,
    head: [[
      "S NO.",
      "NAME OF CABLE",
      "RM Costing (Per Box=305Mtr)",
      "P=10%",
      "P=12%",
      "P=15%",
      "P=20%",
    ]],
    body: rows.map((row) => [
      row.sNo == null ? "—" : String(row.sNo),
      row.name || "",
      formatPrice(row.rmCostingPerBox),
      formatPrice(row.p10),
      formatPrice(row.p12),
      formatPrice(row.p15),
      formatPrice(row.p20),
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [14, 90, 84],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 248, 247],
    },
    columnStyles: {
      0: { cellWidth: 16, halign: "center" },
      1: { cellWidth: 70, halign: "left" },
      2: { cellWidth: 40, halign: "center" },
      3: { cellWidth: 28, halign: "center" },
      4: { cellWidth: 28, halign: "center" },
      5: { cellWidth: 28, halign: "center" },
      6: { cellWidth: 28,halign: "center" },
    },
    margin: { left: 14, right: 14 },
  });

  const arrayBuffer = doc.output("arraybuffer");
  return {
    buffer: Buffer.from(arrayBuffer),
    filename,
  };
}
