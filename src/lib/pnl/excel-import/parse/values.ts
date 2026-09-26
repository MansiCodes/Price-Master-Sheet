import { ManpowerShift, PurchaseType, SaleType, StockCategory } from "@prisma/client";
import {
  normalizePvcExpenseHead,
  normalizeUpcastExpenseHead,
} from "@/lib/plant-catalogs";
import { str } from "@/lib/pnl/excel-import/cells";
import type { ExpenseTarget } from "./types";

export function parseShift(v: unknown): ManpowerShift {
  const s = str(v).toUpperCase();
  return s === "NIGHT" ? ManpowerShift.NIGHT : ManpowerShift.DAY;
}

export function parseSaleType(v: unknown, desc: string): SaleType {
  const s = str(v).toUpperCase().replace(/\s+/g, "_");
  if (s && Object.values(SaleType).includes(s as SaleType)) {
    return s as SaleType;
  }
  if (/copper/i.test(desc) || /copper/i.test(s)) return SaleType.COPPER_SCRAP;
  if (/aluminium|aluminum/i.test(desc) || /alum/i.test(s)) {
    return SaleType.ALUMINIUM_SCRAP;
  }
  if (/finished|fg/i.test(s)) return SaleType.FINISHED_GOOD;
  return SaleType.OTHERS;
}

export function parsePurchaseType(v: unknown, desc: string): PurchaseType {
  const s = str(v).toUpperCase().replace(/\s+/g, "_");
  if (s && Object.values(PurchaseType).includes(s as PurchaseType)) {
    return s as PurchaseType;
  }
  if (/consumable/i.test(s + desc)) return PurchaseType.CONSUMABLE;
  if (/packing/i.test(s + desc)) return PurchaseType.PACKING;
  if (/asset|capital/i.test(s + desc)) return PurchaseType.ASSET;
  return PurchaseType.RAW_MATERIAL;
}

export function parseStockCategory(v: unknown): StockCategory {
  const s = str(v).toUpperCase();
  if (s.includes("WIP") || s.includes("WORK")) return StockCategory.WIP;
  if (s.includes("FG") || s.includes("FINISH")) return StockCategory.FG;
  return StockCategory.RM;
}

export function resolveExpenseHead(raw: string, plantCode?: string | null): string {
  const code = (plantCode ?? "").toUpperCase();
  if (code === "PVC") return normalizePvcExpenseHead(raw);
  if (code === "UPCAST") return normalizeUpcastExpenseHead(raw);
  // Prefer upcast map (broader), then PVC aliases
  const u = normalizeUpcastExpenseHead(raw);
  if (u !== raw.trim()) return u;
  return normalizePvcExpenseHead(raw);
}

export function resolveExpenseTarget(head: string): ExpenseTarget {
  const h = head.trim().toLowerCase();
  if (
    h === "electricity" ||
    h === "fuel & power" ||
    h.startsWith("fuel") ||
    h.includes("electric")
  ) {
    return "electricity";
  }
  if (h === "factory rent" || h === "rent") {
    return "rent";
  }
  if (h === "far" || h.includes("depreciation") || h === "fixed asset") {
    return "far";
  }
  return "petty";
}

export function sectionBreak(text: string): boolean {
  const t = text.toUpperCase();
  return (
    /\bELECTRICITY\b/.test(t) ||
    /\bRENT\b/.test(t) ||
    /\bCLOSING STOCK\b/.test(t) ||
    /\bSTOCK VALUE\b/.test(t)
  );
}
