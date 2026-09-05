import type { CableRate } from "@/lib/sheets/types";

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
  return [
    `${row.sNo ?? "—"})`,
    name,
    `Box ₹${formatPrice(row.rmCostingPerBox)}`,
    `P10 ₹${formatPrice(row.p10)}`,
    `P12 ₹${formatPrice(row.p12)}`,
    `P15 ₹${formatPrice(row.p15)}`,
    `P20 ₹${formatPrice(row.p20)}`,
  ].join(" | ");
}

export function formatPriceSheetSummary(
  rows: CableRate[],
  maxLines = 500,
): string {
  if (rows.length === 0) return "No items selected.";

  const header = "SNO | CABLE | PER BOX | P10 | P12 | P15 | P20";
  const parts: string[] = [header];

  for (const row of rows.slice(0, maxLines)) {
    const next = formatItemLine(row);
    const candidate = [...parts, next].join(" || ");
    if (candidate.length > WHATSAPP_SUMMARY_MAX_CHARS) break;
    parts.push(next);
  }

  const dataRows = parts.length - 1;
  if (rows.length > dataRows) {
    parts.push(`…${rows.length - dataRows} more`);
  }

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
  return `Atlanta Telecables Price Sheet (${dateLabel})\n\n${formatPriceSheetSummary(rows)}`;
}

export function whatsAppShareUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildPriceSheetCsv(rows: CableRate[]): string {
  const header = [
    "S NO.",
    "NAME OF CABLE",
    "RM Costing (Per Box=305Mtr)",
    "P=10%",
    "P=12%",
    "P=15%",
    "P=20%",
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
      escape(row.rmCostingPerBox),
      escape(row.p10),
      escape(row.p12),
      escape(row.p15),
      escape(row.p20),
    ].join(","),
  );
  return `\uFEFF${[header.join(","), ...body].join("\n")}`;
}
