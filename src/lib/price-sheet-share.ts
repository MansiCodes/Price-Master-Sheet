import type { CableRate } from "@/lib/sheets/types";

/**
 * AiSensy / WhatsApp template params cannot contain newlines.
 *
 * The received PDF/preview inside WhatsApp is built from this param, so it must
 * contain the full “table” (all columns + all selected rows) instead of a
 * truncated / partial summary.
 *
 * We still hard-truncate by total character count to avoid provider limits.
 */
const WHATSAPP_SUMMARY_MAX_CHARS = 12000;

function formatPrice(value: number): string {
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function truncate(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function rateRowKey(row: CableRate): string {
  return `${row.sNo ?? "x"}::${row.name}`;
}

function formatItemLine(row: CableRate): string {
  const name = truncate(row.name, 26);
  const spec = truncate(row.specificationFull || row.specification || "", 30);

  // Pipe-separated so the template/PDF can render columns.
  return [
    `${row.sNo ?? "—"})`,
    name,
    spec,
    `RM ₹${formatPrice(row.rmCostingPerMtr)}`,
    `P10 ₹${formatPrice(row.p10)}`,
    `P12 ₹${formatPrice(row.p12)}`,
    `P15 ₹${formatPrice(row.p15)}`,
    `P20 ₹${formatPrice(row.p20)}`,
  ].join(" | ");
}

/** WhatsApp-safe price summary for template param {{4}}. */
export function formatPriceSheetSummary(
  rows: CableRate[],
  maxLines = 500,
): string {
  if (rows.length === 0) return "No items selected.";

  const header = "SNO | CABLE | SPEC | RM/MTR | P10 | P12 | P15 | P20";
  const parts: string[] = [header];

  for (const row of rows.slice(0, maxLines)) {
    const next = formatItemLine(row);
    const candidate = [...parts, next].join(" || ");
    if (candidate.length > WHATSAPP_SUMMARY_MAX_CHARS) break;
    parts.push(next);
  }

  const dataRows = parts.length - 1;
  if (rows.length > dataRows) {
    // Keep a small tail to hint truncation, but prefer “all rows” by raising
    // char limit above typical WhatsApp template constraints.
    parts.push(`…${rows.length - dataRows} more`);
  }

  // Final guard.
  const text = parts.join(" || ");
  return text.length > WHATSAPP_SUMMARY_MAX_CHARS
    ? `${text.slice(0, WHATSAPP_SUMMARY_MAX_CHARS - 1)}…`
    : text;
}

export function buildWhatsAppShareMessage(rows: CableRate[]): string {
  const dateLabel = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  return `Cable Junction Price Sheet (${dateLabel})\n\n${formatPriceSheetSummary(rows)}`;
}

export function whatsAppShareUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildPriceSheetCsv(rows: CableRate[]): string {
  const header = [
    "S NO.",
    "NAME",
    "SPECIFICATION",
    "RM Costing Per Mtr",
    "P10",
    "P12",
    "P15",
    "P20",
  ];
  const escape = (value: string | number | null | undefined) => {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) return `"${str.replaceAll('"', '""')}"`;
    return str;
  };
  const body = rows.map((row) =>
    [
      escape(row.sNo ?? ""),
      escape(row.name),
      escape(row.specificationFull || row.specification || ""),
      escape(row.rmCostingPerMtr),
      escape(row.p10),
      escape(row.p12),
      escape(row.p15),
      escape(row.p20),
    ].join(","),
  );
  return `\uFEFF${[header.join(","), ...body].join("\n")}`;
}
