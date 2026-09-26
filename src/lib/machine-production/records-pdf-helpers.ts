import { jsPDF } from "jspdf";
import { type CellDef } from "jspdf-autotable";

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

export const TEAL: [number, number, number] = [13, 148, 136];
export const TEAL_SOFT: [number, number, number] = [216, 243, 239];
export const MUTED: [number, number, number] = [90, 107, 100];
export const INK: [number, number, number] = [20, 30, 28];

export function num(n: number): string {
  return Number(n).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

/** Helvetica in jsPDF mishandles many Unicode glyphs — keep PDF text ASCII-safe. */
export function pdfText(value: string): string {
  return value
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2192\u2794]/g, "to")
    .replace(/[\u00B7\u2022\u2023]/g, "|")
    .replace(/\u00A0/g, " ");
}

export function blackValue(text: string): CellDef {
  return {
    content: text,
    styles: {
      textColor: INK,
      fontStyle: "normal",
      halign: "right",
    },
  };
}

export function tealValue(text: string): CellDef {
  return {
    content: text,
    styles: {
      textColor: TEAL,
      fontStyle: "bold",
      halign: "right",
    },
  };
}

export function lastTableY(doc: jsPDF, fallback: number): number {
  return (
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? fallback
  );
}

/** Draw mixed-color runs left-to-right (Helvetica has poor Unicode coverage). */
export function drawTextRuns(
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
