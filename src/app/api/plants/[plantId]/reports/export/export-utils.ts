import ExcelJS from "exceljs";
import { getPlantDisplayName } from "@/lib/plant-segments";

/** Safe filename stem from plant display name (e.g. Quad + Signal → Quad-+-Signal). */
export function plantFilenameStem(code: string, name?: string | null): string {
  const label = (getPlantDisplayName(code, name) || code).replace(
    /\s+Plant$/i,
    "",
  );
  const stem = label
    .replace(/\s*\+\s*/g, "-+-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9+._-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return stem || code;
}

export type RouteContext = { params: Promise<{ plantId: string }> };

export type ExportKind =
  | "pnl"
  | "sales"
  | "purchase"
  | "production"
  | "stock"
  | "electricityRent"
  | "factoryRent"
  | "fixedAssets"
  | "expense"
  | "pettyCash";

export type DateFilter = { date?: { gte?: Date; lte?: Date } };

export function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(String(v));
}

export function iso(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF0F766E" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFCCFBF1" },
  };
  row.alignment = { vertical: "middle" };
}
