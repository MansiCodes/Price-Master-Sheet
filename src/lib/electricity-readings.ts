export function isElectricityExpenseHead(head: string) {
  return head === "Electricity" || head === "Fuel & Power";
}

function toNum(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function electricityUnitsKwh(
  opening: unknown,
  closing: unknown,
): number | null {
  const open = toNum(opening);
  const close = toNum(closing);
  if (open == null || close == null) return null;
  return Math.max(0, close - open);
}

export function formatElectricityApprovalDetail(params: {
  nature?: string | null;
  openingReading?: unknown;
  closingReading?: unknown;
}): string {
  const parts: string[] = [];
  const open = toNum(params.openingReading);
  const close = toNum(params.closingReading);
  const units = electricityUnitsKwh(open, close);
  if (open != null) parts.push(`Open ${open}`);
  if (close != null) parts.push(`Close ${close}`);
  if (units != null) parts.push(`Units ${units} kWh`);
  const nature = params.nature?.trim();
  if (nature) parts.push(nature);
  return parts.join(" · ");
}
