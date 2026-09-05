/** Stable content fingerprints for Excel import de-duplication. */
import { createHash } from "node:crypto";

function normPart(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    // Stable rounding for qty/rate comparisons
    return String(Math.round(value * 10_000) / 10_000);
  }
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Short stable hash of normalized field parts. */
export function contentFingerprint(parts: unknown[]): string {
  const payload = parts.map(normPart).join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 28);
}

export function fileContentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function saleSourceKey(
  plantId: string,
  row: {
    date: string;
    customerName: string;
    billNumber: string | null;
    itemDescription: string;
    quantity: number;
    rate: number;
  },
): string {
  const fp = contentFingerprint([
    "sale",
    plantId,
    row.date,
    row.customerName,
    row.billNumber,
    row.itemDescription,
    row.quantity,
    row.rate,
  ]);
  return `xl:sale:${fp}`;
}

export function purchaseSourceKey(
  plantId: string,
  row: {
    date: string;
    vendorName: string;
    billNumber: string | null;
    itemDescription: string;
    quantity: number;
    rate: number;
    gstPercent: number;
  },
): string {
  const fp = contentFingerprint([
    "purchase",
    plantId,
    row.date,
    row.vendorName,
    row.billNumber,
    row.itemDescription,
    row.quantity,
    row.rate,
    row.gstPercent,
  ]);
  return `xl:purchase:${fp}`;
}

export function stockSourceKey(
  plantId: string,
  row: {
    date: string;
    itemName: string;
    quantity: number;
    rate: number;
    unit: string;
  },
): string {
  const fp = contentFingerprint([
    "stock",
    plantId,
    row.date,
    row.itemName,
    row.unit,
    row.quantity,
    row.rate,
  ]);
  return `xl:stock:${fp}`;
}

export function expenseSourceKey(
  plantId: string,
  row: {
    date: string;
    expenseHead: string;
    description: string | null;
    amount: number;
    contractorSalary: number;
    supervisorSalary: number;
    billNumber: string | null;
  },
): string {
  const fp = contentFingerprint([
    "expense",
    plantId,
    row.date,
    row.expenseHead,
    row.description,
    row.amount,
    row.contractorSalary,
    row.supervisorSalary,
    row.billNumber,
  ]);
  return `xl:expense:${fp}`;
}

export function farSourceKey(
  plantId: string,
  row: {
    date: string;
    description: string | null;
    vendor: string | null;
    billNumber: string | null;
    cost: number | null;
  },
): string {
  const fp = contentFingerprint([
    "far",
    plantId,
    row.date,
    row.description,
    row.vendor,
    row.billNumber,
    row.cost,
  ]);
  return `xl:far:${fp}`;
}
