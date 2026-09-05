/**
 * Parse a multi-sheet P&L Excel workbook into typed draft rows.
 * Sheets (any of): Sales, Purchase / Purchases, Stock, Expense / Expenses / Misc Exp.
 * Header row is detected by known column aliases; missing columns stay blank/null.
 */
import ExcelJS from "exceljs";
import {
  ManpowerShift,
  PurchaseType,
  SaleType,
  StockCategory,
} from "@prisma/client";
import {
  asUtcDate,
  cellVal,
  normHeader,
  num,
  str,
  ymd,
} from "@/lib/pnl/excel-import/cells";
import {
  normalizePvcExpenseHead,
  normalizeUpcastExpenseHead,
} from "@/lib/plant-catalogs";

export type ParsedSaleRow = {
  row: number;
  date: string;
  shift: ManpowerShift;
  type: SaleType;
  typeOther: string | null;
  customerName: string;
  billNumber: string | null;
  billDate: string | null;
  itemDescription: string;
  unit: string;
  quantity: number;
  rate: number;
  notes: string | null;
};

export type ParsedPurchaseRow = {
  row: number;
  date: string;
  shift: ManpowerShift;
  type: PurchaseType;
  typeOther: string | null;
  vendorName: string;
  billNumber: string | null;
  billDate: string | null;
  itemDescription: string;
  unit: string;
  quantity: number;
  rate: number;
  gstPercent: number;
  notes: string | null;
};

export type ParsedStockRow = {
  row: number;
  date: string;
  shift: ManpowerShift;
  itemName: string;
  category: StockCategory;
  unit: string;
  quantity: number;
  rate: number;
  notes: string | null;
};

export type ExpenseTarget = "petty" | "electricity" | "rent" | "far";

export type ParsedExpenseRow = {
  row: number;
  date: string;
  shift: ManpowerShift;
  target: ExpenseTarget;
  expenseHead: string;
  nature: string | null;
  description: string | null;
  payMode: string;
  amount: number;
  contractorSalary: number;
  supervisorSalary: number;
  billNumber: string | null;
  openingReading: number | null;
  closingReading: number | null;
  /** FAR fields */
  vendor: string | null;
  cost: number | null;
  gst: number | null;
  depreciationPercent: number | null;
  coveredAreaSqft: number | null;
  rentRatePerSqft: number | null;
};

export type ParseSkip = { sheet: string; row: number; reason: string };

export type ParsedPnlWorkbook = {
  sales: ParsedSaleRow[];
  purchases: ParsedPurchaseRow[];
  stock: ParsedStockRow[];
  expenses: ParsedExpenseRow[];
  skipped: ParseSkip[];
  sheetsFound: string[];
};

type ColMap = Record<string, number>;

const SALE_ALIASES: Record<string, string[]> = {
  date: ["date", "entry date", "sales date"],
  shift: ["shift"],
  customer: ["customer", "customer name", "party", "party name"],
  billNumber: ["bill number", "bill no", "invoice no", "invoice number"],
  billDate: ["bill date", "invoice date"],
  item: ["item", "item description", "description", "particulars", "product"],
  unit: ["unit", "uom"],
  quantity: ["quantity", "qty", "qty nos"],
  rate: ["rate", "price", "rate rs"],
  type: ["type", "sale type"],
  notes: ["notes", "remarks", "remark"],
};

const PURCHASE_ALIASES: Record<string, string[]> = {
  date: ["date", "entry date", "purchase date"],
  shift: ["shift"],
  vendor: ["vendor", "vendor name", "supplier", "party", "party name"],
  billNumber: ["bill number", "bill no", "invoice no", "invoice number"],
  billDate: ["bill date", "invoice date"],
  item: ["item", "item description", "description", "particulars", "product"],
  unit: ["unit", "uom"],
  quantity: ["quantity", "qty"],
  rate: ["rate", "price"],
  gstPercent: ["gst percent", "gst %", "gst", "gstpct"],
  type: ["type", "purchase type"],
  notes: ["notes", "remarks", "remark"],
};

const STOCK_ALIASES: Record<string, string[]> = {
  date: ["date", "entry date", "stock date", "as on"],
  shift: ["shift"],
  item: ["item", "item name", "description", "particulars", "product"],
  category: ["category", "stock category"],
  unit: ["unit", "uom"],
  quantity: ["quantity", "qty", "closing qty"],
  rate: ["rate", "price", "avg rate"],
  value: ["value", "closing value", "amount"],
  notes: ["notes", "remarks", "remark"],
};

const EXPENSE_ALIASES: Record<string, string[]> = {
  date: ["date", "entry date", "expense date"],
  shift: ["shift"],
  head: [
    "expense head",
    "head",
    "expense type",
    "type",
    "category",
    "nature",
  ],
  nature: ["nature", "sub nature", "misc nature"],
  description: ["description", "particulars", "narration", "details"],
  payMode: ["pay mode", "payment mode", "mode", "payment"],
  amount: ["amount", "factory amount", "expense amount", "value"],
  contractor: ["contractor salary", "contractor", "labour"],
  supervisor: ["supervisor salary", "supervisor"],
  billNumber: ["bill number", "bill no"],
  opening: ["opening reading", "opening"],
  closing: ["closing reading", "closing"],
  vendor: ["vendor", "vendor name", "supplier"],
  cost: ["cost", "asset cost", "basic"],
  gst: ["gst", "gst amount"],
  depPercent: ["depreciation percent", "dep percent", "dep %", "depreciation"],
  area: ["area", "covered area", "sqft", "covered area sqft"],
  rentRate: ["rent rate", "rate per sqft", "rent rate per sqft"],
};

function buildColMap(
  headerRow: ExcelJS.Row,
  aliases: Record<string, string[]>,
): ColMap {
  const map: ColMap = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const h = normHeader(cellVal(cell));
    if (!h) return;
    for (const [key, list] of Object.entries(aliases)) {
      if (map[key] != null) continue;
      if (list.some((a) => h === a || h.includes(a))) {
        map[key] = colNumber;
      }
    }
  });
  return map;
}

function findHeaderRow(
  sheet: ExcelJS.Worksheet,
  aliases: Record<string, string[]>,
  maxScan = 15,
): { row: number; map: ColMap } | null {
  const requiredKeys = Object.keys(aliases).slice(0, 3);
  for (let r = 1; r <= maxScan; r++) {
    const map = buildColMap(sheet.getRow(r), aliases);
    const hits = Object.keys(map).length;
    if (hits >= 2) {
      // Prefer a row that matches at least one "core" field
      if (requiredKeys.some((k) => map[k] != null) || hits >= 3) {
        return { row: r, map };
      }
    }
  }
  return null;
}

function getCell(
  sheet: ExcelJS.Worksheet,
  row: number,
  map: ColMap,
  key: string,
): unknown {
  const col = map[key];
  if (col == null) return null;
  return cellVal(sheet.getRow(row).getCell(col));
}

function parseShift(v: unknown): ManpowerShift {
  const s = str(v).toUpperCase();
  return s === "NIGHT" ? ManpowerShift.NIGHT : ManpowerShift.DAY;
}

function parseSaleType(v: unknown, desc: string): SaleType {
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

function parsePurchaseType(v: unknown, desc: string): PurchaseType {
  const s = str(v).toUpperCase().replace(/\s+/g, "_");
  if (s && Object.values(PurchaseType).includes(s as PurchaseType)) {
    return s as PurchaseType;
  }
  if (/consumable/i.test(s + desc)) return PurchaseType.CONSUMABLE;
  if (/packing/i.test(s + desc)) return PurchaseType.PACKING;
  if (/asset|capital/i.test(s + desc)) return PurchaseType.ASSET;
  return PurchaseType.RAW_MATERIAL;
}

function parseStockCategory(v: unknown): StockCategory {
  const s = str(v).toUpperCase();
  if (s.includes("WIP") || s.includes("WORK")) return StockCategory.WIP;
  if (s.includes("FG") || s.includes("FINISH")) return StockCategory.FG;
  return StockCategory.RM;
}

function resolveExpenseHead(raw: string, plantCode?: string | null): string {
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

function findSheet(
  wb: ExcelJS.Workbook,
  names: string[],
): ExcelJS.Worksheet | undefined {
  for (const name of names) {
    const exact = wb.getWorksheet(name);
    if (exact) return exact;
  }
  const lower = names.map((n) => n.toLowerCase());
  for (const sheet of wb.worksheets) {
    const n = sheet.name.trim().toLowerCase();
    if (lower.some((x) => n === x || n.includes(x))) return sheet;
  }
  return undefined;
}

function isStopRow(values: unknown[]): boolean {
  const joined = values.map((v) => str(v).toUpperCase()).join(" ");
  if (!joined.trim()) return true;
  return (
    /\bTOTAL\b/.test(joined) ||
    /\bGRAND TOTAL\b/.test(joined) ||
    /\bTRANSFER\b/.test(joined)
  );
}

export async function parsePnlWorkbook(
  buffer: ArrayBuffer | Buffer,
  opts?: { plantCode?: string | null },
): Promise<ParsedPnlWorkbook> {
  const wb = new ExcelJS.Workbook();
  // exceljs typings accept Buffer-like
  await wb.xlsx.load(buffer as never);

  const result: ParsedPnlWorkbook = {
    sales: [],
    purchases: [],
    stock: [],
    expenses: [],
    skipped: [],
    sheetsFound: wb.worksheets.map((s) => s.name),
  };

  // ── Sales ──────────────────────────────────────────────────────────
  {
    const sheet = findSheet(wb, ["Sales", "Sale"]);
    if (sheet) {
      const header = findHeaderRow(sheet, SALE_ALIASES);
      if (!header) {
        result.skipped.push({
          sheet: sheet.name,
          row: 0,
          reason: "No recognizable Sales header row",
        });
      } else {
        for (let r = header.row + 1; r <= sheet.rowCount; r++) {
          const customer = str(getCell(sheet, r, header.map, "customer"));
          const item = str(getCell(sheet, r, header.map, "item"));
          const qty = num(getCell(sheet, r, header.map, "quantity"));
          const rate = num(getCell(sheet, r, header.map, "rate")) ?? 0;
          if (isStopRow([customer, item, qty])) {
            if (!customer && !item) continue;
            if (/\bTOTAL\b/i.test(customer + item)) break;
          }
          if (!customer && !item) continue;
          const dateRaw = asUtcDate(getCell(sheet, r, header.map, "date"));
          if (!dateRaw || !customer || !item || !(qty != null && qty > 0)) {
            result.skipped.push({
              sheet: sheet.name,
              row: r,
              reason: "Missing date, customer, item, or quantity",
            });
            continue;
          }
          const billDate = asUtcDate(getCell(sheet, r, header.map, "billDate"));
          const type = parseSaleType(
            getCell(sheet, r, header.map, "type"),
            item,
          );
          result.sales.push({
            row: r,
            date: ymd(dateRaw),
            shift: parseShift(getCell(sheet, r, header.map, "shift")),
            type,
            typeOther: type === SaleType.OTHERS ? item : null,
            customerName: customer,
            billNumber: str(getCell(sheet, r, header.map, "billNumber")) || null,
            billDate: billDate ? ymd(billDate) : null,
            itemDescription: item,
            unit: str(getCell(sheet, r, header.map, "unit")) || "nos",
            quantity: qty,
            rate,
            notes: str(getCell(sheet, r, header.map, "notes")) || null,
          });
        }
      }
    }
  }

  // ── Purchase ───────────────────────────────────────────────────────
  {
    const sheet = findSheet(wb, ["Purchase", "Purchases"]);
    if (sheet) {
      const header = findHeaderRow(sheet, PURCHASE_ALIASES);
      if (!header) {
        result.skipped.push({
          sheet: sheet.name,
          row: 0,
          reason: "No recognizable Purchase header row",
        });
      } else {
        for (let r = header.row + 1; r <= sheet.rowCount; r++) {
          const vendor = str(getCell(sheet, r, header.map, "vendor"));
          const item = str(getCell(sheet, r, header.map, "item"));
          const qty = num(getCell(sheet, r, header.map, "quantity"));
          const rate = num(getCell(sheet, r, header.map, "rate")) ?? 0;
          if (!vendor && !item) continue;
          if (/\bTOTAL\b/i.test(vendor + item)) break;
          const dateRaw = asUtcDate(getCell(sheet, r, header.map, "date"));
          if (!dateRaw || !vendor || !item || !(qty != null && qty > 0)) {
            result.skipped.push({
              sheet: sheet.name,
              row: r,
              reason: "Missing date, vendor, item, or quantity",
            });
            continue;
          }
          const billDate = asUtcDate(getCell(sheet, r, header.map, "billDate"));
          const gstRaw = num(getCell(sheet, r, header.map, "gstPercent"));
          // If cell looks like absolute GST amount (large), treat blank % as 0; if 0–100 use as %
          let gstPercent = 0;
          if (gstRaw != null) {
            gstPercent = gstRaw > 100 ? 0 : gstRaw;
          }
          const type = parsePurchaseType(
            getCell(sheet, r, header.map, "type"),
            item,
          );
          result.purchases.push({
            row: r,
            date: ymd(dateRaw),
            shift: parseShift(getCell(sheet, r, header.map, "shift")),
            type,
            typeOther: type === PurchaseType.OTHERS ? item : null,
            vendorName: vendor,
            billNumber: str(getCell(sheet, r, header.map, "billNumber")) || null,
            billDate: billDate ? ymd(billDate) : null,
            itemDescription: item,
            unit: str(getCell(sheet, r, header.map, "unit")) || "kg",
            quantity: qty,
            rate,
            gstPercent,
            notes: str(getCell(sheet, r, header.map, "notes")) || null,
          });
        }
      }
    }
  }

  // ── Stock ──────────────────────────────────────────────────────────
  {
    const sheet = findSheet(wb, ["Stock", "Closing Stock", "Stocks"]);
    if (sheet) {
      const header = findHeaderRow(sheet, STOCK_ALIASES);
      if (!header) {
        result.skipped.push({
          sheet: sheet.name,
          row: 0,
          reason: "No recognizable Stock header row",
        });
      } else {
        for (let r = header.row + 1; r <= sheet.rowCount; r++) {
          const item = str(getCell(sheet, r, header.map, "item"));
          const qty = num(getCell(sheet, r, header.map, "quantity"));
          let rate = num(getCell(sheet, r, header.map, "rate"));
          const value = num(getCell(sheet, r, header.map, "value"));
          if (!item) continue;
          if (/\bTOTAL\b/i.test(item)) break;
          const dateRaw = asUtcDate(getCell(sheet, r, header.map, "date"));
          if (!dateRaw || !(qty != null && qty > 0)) {
            result.skipped.push({
              sheet: sheet.name,
              row: r,
              reason: "Missing date, item, or quantity",
            });
            continue;
          }
          if ((rate == null || rate === 0) && value != null && qty > 0) {
            rate = value / qty;
          }
          rate = rate ?? 0;
          result.stock.push({
            row: r,
            date: ymd(dateRaw),
            shift: parseShift(getCell(sheet, r, header.map, "shift")),
            itemName: item,
            category: parseStockCategory(
              getCell(sheet, r, header.map, "category"),
            ),
            unit: str(getCell(sheet, r, header.map, "unit")) || "kg",
            quantity: qty,
            rate,
            notes: str(getCell(sheet, r, header.map, "notes")) || null,
          });
        }
      }
    }
  }

  // ── Expense ────────────────────────────────────────────────────────
  {
    const sheet = findSheet(wb, [
      "Expense",
      "Expenses",
      "Misc Exp.",
      "Misc Exp",
      "Petty Cash",
    ]);
    if (sheet) {
      const header = findHeaderRow(sheet, EXPENSE_ALIASES);
      if (!header) {
        result.skipped.push({
          sheet: sheet.name,
          row: 0,
          reason: "No recognizable Expense header row",
        });
      } else {
        for (let r = header.row + 1; r <= sheet.rowCount; r++) {
          const headRaw =
            str(getCell(sheet, r, header.map, "head")) ||
            str(getCell(sheet, r, header.map, "nature"));
          const description = str(getCell(sheet, r, header.map, "description"));
          const amount = num(getCell(sheet, r, header.map, "amount")) ?? 0;
          const contractor =
            num(getCell(sheet, r, header.map, "contractor")) ?? 0;
          const supervisor =
            num(getCell(sheet, r, header.map, "supervisor")) ?? 0;
          const cost = num(getCell(sheet, r, header.map, "cost"));
          if (!headRaw && !description && amount === 0 && !cost) continue;
          if (/\bTOTAL\b/i.test(headRaw + description)) break;
          const dateRaw = asUtcDate(getCell(sheet, r, header.map, "date"));
          if (!dateRaw || !headRaw) {
            result.skipped.push({
              sheet: sheet.name,
              row: r,
              reason: "Missing date or expense head",
            });
            continue;
          }
          const expenseHead = resolveExpenseHead(headRaw, opts?.plantCode);
          const target = resolveExpenseTarget(expenseHead);
          const natureRaw = str(getCell(sheet, r, header.map, "nature"));
          result.expenses.push({
            row: r,
            date: ymd(dateRaw),
            shift: parseShift(getCell(sheet, r, header.map, "shift")),
            target,
            expenseHead,
            nature: natureRaw || null,
            description: description || null,
            payMode: str(getCell(sheet, r, header.map, "payMode")) || "Cash",
            amount,
            contractorSalary: contractor,
            supervisorSalary: supervisor,
            billNumber:
              str(getCell(sheet, r, header.map, "billNumber")) || null,
            openingReading: num(getCell(sheet, r, header.map, "opening")),
            closingReading: num(getCell(sheet, r, header.map, "closing")),
            vendor: str(getCell(sheet, r, header.map, "vendor")) || null,
            cost,
            gst: num(getCell(sheet, r, header.map, "gst")),
            depreciationPercent: num(
              getCell(sheet, r, header.map, "depPercent"),
            ),
            coveredAreaSqft: num(getCell(sheet, r, header.map, "area")),
            rentRatePerSqft: num(getCell(sheet, r, header.map, "rentRate")),
          });
        }
      }
    }
  }

  return result;
}
