import type { CableRate } from "@/lib/sheets/types";

function formatPrice(value: number): string {
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function rateRowKey(row: CableRate): string {
  return `${row.sNo ?? "x"}::${row.name}`;
}

/** Compact WhatsApp-friendly summary (AiSensy template param limit ~1024 chars). */
export function formatPriceSheetSummary(rows: CableRate[], maxLines = 12): string {
  const lines = rows.slice(0, maxLines).map((row) => {
    const spec = row.specification || row.specificationFull || "";
    const specBit = spec ? ` (${spec.slice(0, 40)}${spec.length > 40 ? "…" : ""})` : "";
    return `${row.sNo ?? "—"}. ${row.name}${specBit} | P10 ₹${formatPrice(row.p10)} | P12 ₹${formatPrice(row.p12)} | P15 ₹${formatPrice(row.p15)} | P20 ₹${formatPrice(row.p20)}`;
  });
  if (rows.length > maxLines) {
    lines.push(`…and ${rows.length - maxLines} more item(s).`);
  }
  const text = lines.join("\n");
  return text.length > 900 ? `${text.slice(0, 897)}…` : text;
}

export function buildPriceSheetCsv(rows: CableRate[]): string {
  const header = ["S NO.", "NAME", "SPECIFICATION", "P10", "P12", "P15", "P20"];
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
      escape(row.p10),
      escape(row.p12),
      escape(row.p15),
      escape(row.p20),
    ].join(","),
  );
  return `\uFEFF${[header.join(","), ...body].join("\n")}`;
}
