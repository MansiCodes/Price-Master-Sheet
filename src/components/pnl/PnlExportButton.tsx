"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ReportTab } from "@/components/pnl/types";

type PnlLine = { label: string; amount: number | null; ratio: number | null; kind: string };
// jsPDF instance type — resolved at runtime via dynamic import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JDoc = any;

function fmt(n: number | null | undefined): string {
  if (n == null) return "";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtR(n: number | null | undefined): string {
  if (n == null) return "";
  return `${Number(n).toFixed(2)}%`;
}

function filterLines(lines: PnlLine[]): PnlLine[] {
  return lines.filter((r) => {
    if (r.kind === "blank") return false;
    if (r.amount == null && (r.kind === "profit" || r.kind === "tax")) return false;
    return true;
  });
}

const TEAL: [number, number, number] = [13, 148, 136];
const PEACH: [number, number, number] = [255, 235, 205];
const WHITE: [number, number, number] = [255, 255, 255];
const BORDER: [number, number, number] = [209, 213, 219];
const ROW_H = 5.5;
const HEAD_H = 6.5;
const TOTAL_H = 7;
const FONT = 7.5;

function drawSide(
  doc: JDoc,
  x: number,
  w: number,
  lines: PnlLine[],
  total: number,
  totalLabel: string,
  showRatio: boolean,
  topY: number,
): number {
  const amtW = 28;
  const ratW = showRatio ? 18 : 0;
  const labW = w - amtW - ratW;

  let y = topY;

  // Header row
  doc.setFillColor(...TEAL);
  doc.rect(x, y, w, HEAD_H, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(FONT);
  doc.setFont("helvetica", "bold");
  doc.text("PARTICULARS", x + 1.5, y + HEAD_H / 2 + 1);
  doc.text("AMOUNT", x + labW + amtW - 1.5, y + HEAD_H / 2 + 1, { align: "right" });
  if (showRatio) doc.text("RATIO %", x + w - 1.5, y + HEAD_H / 2 + 1, { align: "right" });
  y += HEAD_H;

  // Body rows
  doc.setTextColor(0, 0, 0);
  for (const line of lines) {
    doc.setFillColor(...WHITE);
    doc.rect(x, y, w, ROW_H, "F");
    doc.setDrawColor(...BORDER);
    doc.line(x, y + ROW_H, x + w, y + ROW_H);

    const indent = line.kind === "item" ? 4 : 0;
    const isBold = line.kind === "header" || line.kind === "subtotal" || line.kind === "profit";
    const isTax = line.kind === "tax";

    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(FONT);
    if (isTax) doc.setTextColor(185, 28, 28);
    else doc.setTextColor(0, 0, 0);

    const label = line.kind === "header" ? line.label.toUpperCase() : line.label;
    doc.text(label, x + 1.5 + indent, y + ROW_H / 2 + 1);

    if (line.amount != null) {
      doc.text(fmt(line.amount), x + labW + amtW - 1.5, y + ROW_H / 2 + 1, { align: "right" });
    }
    if (showRatio && line.ratio != null) {
      doc.text(fmtR(line.ratio), x + w - 1.5, y + ROW_H / 2 + 1, { align: "right" });
    }
    y += ROW_H;
  }

  // Total bar
  doc.setFillColor(...PEACH);
  doc.rect(x, y, w, TOTAL_H, "F");
  doc.setDrawColor(...BORDER);
  doc.rect(x, y, w, TOTAL_H, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT);
  doc.setTextColor(0, 0, 0);
  doc.text(totalLabel, x + 1.5, y + TOTAL_H / 2 + 1);
  doc.text(fmt(total), x + labW + amtW - 1.5, y + TOTAL_H / 2 + 1, { align: "right" });
  y += TOTAL_H;

  // Outer border
  doc.setDrawColor(31, 41, 55);
  doc.rect(x, topY, w, y - topY, "S");

  return y;
}

async function exportPnlAsPdf(plantId: string, from: string, to: string) {
  const res = await fetch(
    `/api/plants/${plantId}/pnl?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  if (!res.ok) throw new Error("Failed to fetch P&L data");
  const json = await res.json();
  const pnl = json.pnl ?? json;

  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const mx = 8;
  const gap = 2;
  const halfW = (pageW - mx * 2 - gap) / 2;
  const showRatio = true;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Profit & Loss Statement  (${from} to ${to})`, mx, 12);

  const sections = [
    { block: pnl.trading },
    { block: pnl.indirect },
  ];

  let y = 16;

  for (const { block } of sections) {
    const debitLines = filterLines(block.debit ?? []);
    const creditLines = filterLines(block.credit ?? []);

    const leftY = drawSide(doc, mx, halfW, debitLines, block.total, "Debit total", showRatio, y);
    const rightY = drawSide(doc, mx + halfW + gap, halfW, creditLines, block.total, "Credit total", showRatio, y);

    y = Math.max(leftY, rightY) + 4;
  }

  doc.save(`PnL-${from}-to-${to}.pdf`);
}

function downloadBlob(blob: Blob, disposition: string, fallback: string) {
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match?.[1] ?? fallback;
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

export function PnlExportButton({
  plantId,
  kind,
  from,
  to,
}: {
  plantId: string;
  kind: ReportTab;
  from: string;
  to: string;
}) {
  const t = useTranslations("pnl");
  const [exporting, setExporting] = useState(false);
  const isPnl = kind === "pnl";

  async function onExport() {
    setExporting(true);
    try {
      if (isPnl) {
        await exportPnlAsPdf(plantId, from, to);
        toast.success("P&L exported as PDF");
      } else {
        const url = `/api/plants/${plantId}/reports/export?kind=${encodeURIComponent(kind)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(json?.error ?? "Export failed");
        }
        const blob = await res.blob();
        downloadBlob(
          blob,
          res.headers.get("Content-Disposition") ?? "",
          `${kind}-export.xlsx`,
        );
        toast.success(t("exportExcel"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      type="button"
      className="pnl-export-btn pnl-export-btn--compact"
      onClick={() => void onExport()}
      disabled={exporting}
      title={isPnl ? "Export PDF" : t("exportExcel")}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
        <path d="M14 3v5h5" />
        <path d="M8 13h8M8 17h5" />
      </svg>
      <span className="pnl-export-btn__label">
        {exporting ? "…" : isPnl ? "PDF" : t("exportExcel")}
      </span>
    </button>
  );
}
