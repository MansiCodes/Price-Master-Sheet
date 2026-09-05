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
  PVC_ATCL_PURCHASE_NOTE_PREFIX,
  PVC_ATCL_VENDOR_NAME,
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
  inMeter?: number | null;
  qtyMtr?: number | null;
  meterUnit?: string | null;
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
  customer: [
    "customer name",
    "customer",
    "party name",
    "party",
    "supplier name",
    "supplier",
  ],
  billNumber: [
    "bill number",
    "bill no",
    "invoice no",
    "invoice number",
    "invoice no.",
  ],
  billDate: ["bill date", "invoice date"],
  item: [
    "conductor size",
    "description of goods",
    "item details",
    "item description",
    "item",
    "description",
    "particulars",
    "product",
  ],
  unit: ["unit", "uom"],
  quantity: ["quantity", "qty", "qty nos"],
  qtyMtr: ["qty mtr", "qty-mtr", "quantity mtr"],
  rate: ["rate", "price", "rate rs"],
  salesValue: ["sales value", "goods value", "basic value", "amount"],
  type: ["type", "sale type"],
  notes: ["notes", "remarks", "remark"],
  inMeter: ["in meter", "in metres", "meter"],
};

const PURCHASE_ALIASES: Record<string, string[]> = {
  date: ["date", "entry date", "purchase date"],
  shift: ["shift"],
  vendor: [
    "vendor s name",
    "vendor name",
    "vendor",
    "supplier name",
    "supplier",
    "party name",
    "party",
  ],
  billNumber: [
    "bill number",
    "bill no",
    "invoice no challan no",
    "invoice no",
    "invoice number",
    "challan no",
  ],
  billDate: ["bill date", "invoice date"],
  item: [
    "item details",
    "description of goods",
    "item description",
    "item",
    "description",
    "particulars",
    "product",
  ],
  unit: ["unit", "uom"],
  quantity: ["quantity", "qty"],
  rate: ["rate", "price"],
  gstPercent: ["gst percent", "gst %", "gstpct"],
  gstin: ["gstin gst no", "gstin", "gst no"],
  type: ["type", "purchase type"],
  source: [
    "purchase source",
    "source",
    "purchase from",
    "stock taken from atcl",
  ],
  notes: ["notes", "remarks", "remark"],
};

/** Same rules as Today Entry: Vendor vs Stock Taken from ATCL. */
function applyPurchaseSource(
  sourceRaw: string,
  vendorName: string,
  notes: string | null,
): { vendorName: string; notes: string | null } {
  const src = sourceRaw.trim().toLowerCase();
  const isAtcl =
    /stock\s*taken\s*from\s*atcl|from\s*atcl|\batcl\b/.test(src) &&
    !/vendor|purchase from vendor/.test(src);
  const vendorLooksAtcl = /atcl/i.test(vendorName);
  if (!isAtcl && !vendorLooksAtcl) {
    return { vendorName: vendorName || "—", notes };
  }
  const taggedNotes =
    notes && notes.startsWith(PVC_ATCL_PURCHASE_NOTE_PREFIX)
      ? notes
      : notes
        ? `${PVC_ATCL_PURCHASE_NOTE_PREFIX} · ${notes}`
        : PVC_ATCL_PURCHASE_NOTE_PREFIX;
  return {
    vendorName: vendorName.trim() || PVC_ATCL_VENDOR_NAME,
    notes: taggedNotes,
  };
}

const STOCK_ALIASES: Record<string, string[]> = {
  date: ["date", "entry date", "stock date", "as on"],
  shift: ["shift"],
  item: [
    "list of items",
    "particulars",
    "item name",
    "item",
    "description",
    "product",
  ],
  size: ["size", "conductor size"],
  unit: ["unit", "uom"],
  quantity: [
    "issued quantity",
    "closing stock",
    "closing qty",
    "quantity",
    "qty",
  ],
  rate: ["rate", "price", "avg rate"],
  value: ["closing value", "value", "amount"],
  category: ["stock category", "category", "stock"],
  notes: ["notes", "remarks", "remark"],
};

const EXPENSE_ALIASES: Record<string, string[]> = {
  date: ["payment date", "date", "entry date", "expense date"],
  shift: ["shift"],
  head: [
    "expense head",
    "head",
    "expense type",
    "type",
    "category",
    "nature of expense",
    "nature",
  ],
  nature: ["nature of expense", "nature", "sub nature", "misc nature"],
  description: [
    "description of expense",
    "description",
    "particulars",
    "narration",
    "details",
  ],
  payMode: ["pay mode", "payment mode", "mode", "payment"],
  amount: [
    "factory expense",
    "factory amount",
    "expense amount",
    "amount",
    "value",
  ],
  contractor: ["contractor salary", "contractor", "labour"],
  supervisor: ["supervisor salary", "supervisor"],
  billNumber: ["bill number", "bill no"],
  opening: ["opening reading", "opening"],
  closing: ["closing reading", "closing"],
  vendor: ["vendor", "vendor name", "supplier"],
  cost: ["cost", "asset cost", "basic", "billing price"],
  gst: ["gst amount", "gst"],
  depPercent: [
    "depreciation percent",
    "dep percent",
    "dep %",
    "dep",
    "depreciation",
  ],
  area: ["covered area", "area", "sqft", "covered area sqft"],
  rentRate: ["rent rate", "rate per sqft", "rent rate per sqft"],
};

const ELECTRICITY_ALIASES: Record<string, string[]> = {
  date: ["months", "month", "date", "entry date"],
  opening: ["opening reading", "opening"],
  closing: ["closing reading", "closing"],
  amount: [
    "electricity fuel power amt",
    "electricity bill amt",
    "electricity bill amount",
    "fuel power amt",
    "bill amt",
    "amount",
    "value",
  ],
  notes: ["notes", "remark", "remarks"],
};

const RENT_ALIASES: Record<string, string[]> = {
  date: ["months", "month", "date", "entry date"],
  area: ["covered area", "area", "sqft"],
  rentRate: ["rent rate", "rate per sqft"],
  amount: ["rent exp", "rent expense", "amount", "value"],
  rateOnly: ["rate"],
  notes: ["notes", "remark", "remarks"],
};

const FAR_ALIASES: Record<string, string[]> = {
  date: ["bill date", "date", "entry date"],
  vendor: ["supplier name", "supplier", "vendor", "vendor name"],
  description: [
    "assets description",
    "asset description",
    "description",
    "particulars",
  ],
  billNumber: ["bill number", "bill no"],
  billDate: ["bill date", "invoice date"],
  cost: ["billing price", "cost", "asset cost", "basic"],
  gst: ["gst 18", "gst amount", "gst"],
  depPercent: ["dep %", "dep", "depreciation percent", "depreciation"],
  notes: ["notes", "remarks", "remark"],
};

function buildColMap(
  headerRow: ExcelJS.Row,
  aliases: Record<string, string[]>,
): ColMap {
  const map: ColMap = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const h = normHeader(cellVal(cell));
    if (!h) return;
    // Prefer exact header matches first so short aliases (e.g. "stock")
    // do not steal columns like "Closing Stock".
    for (const [key, list] of Object.entries(aliases)) {
      if (map[key] != null) continue;
      if (list.some((a) => h === a)) {
        map[key] = colNumber;
        return;
      }
    }
    for (const [key, list] of Object.entries(aliases)) {
      if (map[key] != null) continue;
      if (list.some((a) => a.length >= 4 && h.includes(a))) {
        map[key] = colNumber;
        return;
      }
    }
  });
  return map;
}

function findHeaderRow(
  sheet: ExcelJS.Worksheet,
  aliases: Record<string, string[]>,
  maxScan = 40,
  startRow = 1,
): { row: number; map: ColMap } | null {
  const requiredKeys = Object.keys(aliases).slice(0, 3);
  const end = Math.min(maxScan, sheet.rowCount || maxScan);
  for (let r = startRow; r <= end; r++) {
    const map = buildColMap(sheet.getRow(r), aliases);
    const hits = Object.keys(map).length;
    if (hits >= 2) {
      if (requiredKeys.some((k) => map[k] != null) || hits >= 3) {
        return { row: r, map };
      }
    }
  }
  return null;
}

/** Prefer an exact sheet name; fall back to fuzzy includes. */
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
    if (lower.some((x) => n === x)) return sheet;
  }
  for (const sheet of wb.worksheets) {
    const n = sheet.name.trim().toLowerCase();
    if (lower.some((x) => n.includes(x))) return sheet;
  }
  return undefined;
}

/** Prefer named sheets; otherwise any sheet whose header matches the aliases. */
function findSheetWithHeaders(
  wb: ExcelJS.Workbook,
  preferredNames: string[],
  aliases: Record<string, string[]>,
  minHits = 3,
  opts?: {
    /** At least one of these keys must be present in the header map. */
    requireAny?: string[];
    /** Skip sheet when this returns true. */
    rejectIf?: (
      map: ColMap,
      sheet: ExcelJS.Worksheet,
      headerRow: number,
    ) => boolean;
    /** Skip these sheet names (already claimed by another import). */
    excludeSheetNames?: Set<string>;
  },
): { sheet: ExcelJS.Worksheet; header: { row: number; map: ColMap } } | null {
  const requireAny = opts?.requireAny;
  const rejectIf = opts?.rejectIf;
  const excluded = opts?.excludeSheetNames;

  const trySheet = (sheet: ExcelJS.Worksheet) => {
    if (excluded?.has(sheet.name)) return null;
    const header = findHeaderRow(sheet, aliases);
    if (!header) return null;
    const hits = Object.keys(header.map).length;
    if (hits < minHits) return null;
    if (
      requireAny &&
      requireAny.length > 0 &&
      !requireAny.some((k) => header.map[k] != null)
    ) {
      return null;
    }
    if (rejectIf?.(header.map, sheet, header.row)) return null;
    return { sheet, header, hits };
  };

  const preferred = findSheet(wb, preferredNames);
  if (preferred) {
    const hit = trySheet(preferred);
    if (hit) return { sheet: hit.sheet, header: hit.header };
  }

  let best: {
    sheet: ExcelJS.Worksheet;
    header: { row: number; map: ColMap };
    hits: number;
  } | null = null;
  for (const sheet of wb.worksheets) {
    if (preferred && sheet.name === preferred.name) continue;
    const hit = trySheet(sheet);
    if (!hit) continue;
    if (!best || hit.hits > best.hits) best = hit;
  }
  return best ? { sheet: best.sheet, header: best.header } : null;
}

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

function findSheetFallbackDate(sheet: ExcelJS.Worksheet): Date | null {
  const end = Math.min(45, sheet.rowCount || 45);
  for (let r = 1; r <= end; r++) {
    const row = sheet.getRow(r);
    let found: Date | null = null;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      if (found) return;
      const v = cellVal(cell);
      const s = str(v);
      if (/as on/i.test(s) || /stock value/i.test(s)) {
        // Date often sits in a nearby cell on the same row
        for (let c = Math.max(1, col - 2); c <= col + 6; c++) {
          const nearby = asUtcDate(cellVal(row.getCell(c)));
          if (nearby) {
            found = nearby;
            return;
          }
        }
        const m = s.match(
          /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}-[A-Za-z]{3}-\d{2,4})/,
        );
        if (m) {
          const parsed = asUtcDate(m[1]);
          if (parsed) found = parsed;
        }
        return;
      }
      const d = asUtcDate(v);
      if (d) found = d;
    });
    if (found) return found;
  }
  return null;
}

function resolveEntryDate(
  primary: unknown,
  fallback: unknown,
  sheetFallback: Date | null,
): Date | null {
  return asUtcDate(primary) ?? asUtcDate(fallback) ?? sheetFallback;
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

function sectionBreak(text: string): boolean {
  const t = text.toUpperCase();
  return (
    /\bELECTRICITY\b/.test(t) ||
    /\bRENT\b/.test(t) ||
    /\bCLOSING STOCK\b/.test(t) ||
    /\bSTOCK VALUE\b/.test(t)
  );
}

export async function parsePnlWorkbook(
  buffer: ArrayBuffer | Buffer,
  opts?: { plantCode?: string | null },
): Promise<ParsedPnlWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as never);

  const result: ParsedPnlWorkbook = {
    sales: [],
    purchases: [],
    stock: [],
    expenses: [],
    skipped: [],
    sheetsFound: wb.worksheets.map((s) => s.name),
  };

  const claimedSheets = new Set<string>();

  // ── Sales (any sheet with sales-like headers — template not required) ─
  {
    const found = findSheetWithHeaders(
      wb,
      ["Sales", "Sale", "SALES", "Sales Register"],
      SALE_ALIASES,
      3,
      {
        requireAny: ["customer", "item"],
        // Vendor/supplier sheets belong to Purchase, not Sales
        rejectIf: (map, sheet, headerRow) => {
          if (map.customer != null) return false;
          const probe = buildColMap(sheet.getRow(headerRow), {
            vendor: [
              "vendor s name",
              "vendor name",
              "vendor",
              "supplier name",
              "supplier",
            ],
          });
          return probe.vendor != null;
        },
      },
    );
    if (!found) {
      // Sales optional when the file only has Purchase/Stock/etc.
    } else {
      const { sheet, header } = found;
      claimedSheets.add(sheet.name);
      const sheetDate = findSheetFallbackDate(sheet);
      for (let r = header.row + 1; r <= sheet.rowCount; r++) {
        const customer = str(getCell(sheet, r, header.map, "customer"));
        const item = str(getCell(sheet, r, header.map, "item"));
        const qtyRaw = num(getCell(sheet, r, header.map, "quantity"));
        const qtyMtrVal = num(getCell(sheet, r, header.map, "qtyMtr"));
        const inMeterVal = num(getCell(sheet, r, header.map, "inMeter"));
        let rate = num(getCell(sheet, r, header.map, "rate"));
        const salesValue = num(getCell(sheet, r, header.map, "salesValue"));

        // Prefer Quantity when > 0; otherwise CAT6 QTY-MTR
        let qty =
          qtyRaw != null && qtyRaw > 0
            ? qtyRaw
            : qtyMtrVal != null && qtyMtrVal > 0
              ? qtyMtrVal
              : qtyRaw;

        const blankish =
          !customer &&
          !item &&
          !(qty != null && qty > 0) &&
          !(salesValue != null && salesValue > 0);
        if (blankish) continue;
        if (/\bTOTAL\b/i.test(`${customer} ${item}`)) break;
        if (!item && !customer) continue;

        // Incomplete trailing rows (name/item only, no amounts) — ignore quietly
        const hasAmountSignal =
          (qty != null && qty > 0) ||
          (salesValue != null && salesValue > 0) ||
          (rate != null && rate > 0 && (qtyMtrVal != null || inMeterVal != null));
        if (!hasAmountSignal) continue;

        const billDate = asUtcDate(getCell(sheet, r, header.map, "billDate"));
        const dateRaw =
          resolveEntryDate(
            getCell(sheet, r, header.map, "date"),
            billDate,
            sheetDate,
          ) ?? todayUtc();

        if (!(qty != null && qty > 0)) {
          if (salesValue != null && rate != null && rate > 0) {
            qty = salesValue / rate;
          } else if (salesValue != null && salesValue > 0) {
            // Last resort: treat sales value as qty 1 @ that rate
            qty = 1;
            rate = rate ?? salesValue;
          } else {
            result.skipped.push({
              sheet: sheet.name,
              row: r,
              reason: "Missing quantity",
            });
            continue;
          }
        }
        if ((rate == null || rate === 0) && salesValue != null && qty > 0) {
          rate = salesValue / qty;
        }
        rate = rate ?? 0;

        const resolvedCustomer = customer || "—";
        const resolvedItem = item || customer || "Sale item";
        const unitRaw = str(getCell(sheet, r, header.map, "unit"));
        // Avoid "Unit (MTR)" when Quantity unit should be NOS for CAT6
        const unit =
          unitRaw && !/mtr/i.test(unitRaw)
            ? unitRaw
            : opts?.plantCode?.toUpperCase() === "CAT6"
              ? "NOS"
              : unitRaw || "nos";

        const type = parseSaleType(
          getCell(sheet, r, header.map, "type"),
          resolvedItem,
        );
        result.sales.push({
          row: r,
          date: ymd(dateRaw),
          shift: parseShift(getCell(sheet, r, header.map, "shift")),
          type,
          typeOther: type === SaleType.OTHERS ? resolvedItem : null,
          customerName: resolvedCustomer,
          billNumber: str(getCell(sheet, r, header.map, "billNumber")) || null,
          billDate: billDate ? ymd(billDate) : null,
          itemDescription: resolvedItem,
          unit,
          quantity: qty,
          rate,
          notes: str(getCell(sheet, r, header.map, "notes")) || null,
          inMeter: inMeterVal,
          qtyMtr: qtyMtrVal,
          meterUnit: /mtr/i.test(unitRaw) ? unitRaw : "MTR",
        });
      }
    }
  }

  // ── Purchase (any sheet with purchase-like headers) ────────────────
  {
    const found = findSheetWithHeaders(
      wb,
      ["Purchase", "Purchases", "PURCHASE", "Purchase Register"],
      PURCHASE_ALIASES,
      3,
      {
        requireAny: ["vendor"],
        excludeSheetNames: claimedSheets,
      },
    );
    if (found) {
      const { sheet, header } = found;
      claimedSheets.add(sheet.name);
      const sheetDate = findSheetFallbackDate(sheet);
      for (let r = header.row + 1; r <= sheet.rowCount; r++) {
        const vendor = str(getCell(sheet, r, header.map, "vendor"));
        const item = str(getCell(sheet, r, header.map, "item"));
        const qty = num(getCell(sheet, r, header.map, "quantity"));
        const rate = num(getCell(sheet, r, header.map, "rate")) ?? 0;
        if (!vendor && !item) continue;
        if (/\bTOTAL\b/i.test(vendor + item)) break;
        const billDate = asUtcDate(getCell(sheet, r, header.map, "billDate"));
        const dateRaw =
          resolveEntryDate(
            getCell(sheet, r, header.map, "date"),
            billDate,
            sheetDate,
          ) ?? todayUtc();
        if (!item && !vendor) continue;
        if (!(qty != null && qty > 0)) {
          result.skipped.push({
            sheet: sheet.name,
            row: r,
            reason: "Missing quantity",
          });
          continue;
        }
        const gstRaw = num(getCell(sheet, r, header.map, "gstPercent"));
        let gstPercent = 18;
        if (gstRaw != null) {
          gstPercent = gstRaw > 100 ? 18 : gstRaw;
        }
        if (
          opts?.plantCode?.toUpperCase() === "CAT6" &&
          header.map.gstPercent == null
        ) {
          gstPercent = 0;
        }
        const type = parsePurchaseType(
          getCell(sheet, r, header.map, "type"),
          item || vendor,
        );
        const sourced = applyPurchaseSource(
          str(getCell(sheet, r, header.map, "source")),
          vendor,
          str(getCell(sheet, r, header.map, "notes")) || null,
        );
        result.purchases.push({
          row: r,
          date: ymd(dateRaw),
          shift: parseShift(getCell(sheet, r, header.map, "shift")),
          type,
          typeOther: type === PurchaseType.OTHERS ? item || vendor : null,
          vendorName: sourced.vendorName,
          billNumber: str(getCell(sheet, r, header.map, "billNumber")) || null,
          billDate: billDate ? ymd(billDate) : null,
          itemDescription: item || vendor || "Purchase item",
          unit: str(getCell(sheet, r, header.map, "unit")) || "kg",
          quantity: qty,
          rate,
          gstPercent,
          notes: sourced.notes,
        });
      }
    }
  }

  // ── Stock (dedicated sheet or ATCL combined sheet) ─────────────────
  {
    const sheet = findSheet(wb, [
      "Stock",
      "Closing Stock",
      "Stocks",
      "Electricity, Rent & Stock",
    ]);
    if (sheet) {
      const header = findHeaderRow(sheet, STOCK_ALIASES);
      const sheetDate = findSheetFallbackDate(sheet);
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
          const rowText = [
            item,
            str(getCell(sheet, r, header.map, "category")),
          ].join(" ");
          if (sectionBreak(rowText) && !qty) break;
          if (!item) {
            // Blank gap between stock and electricity on combined sheets
            if (result.stock.length > 0) {
              let blankish = true;
              sheet.getRow(r).eachCell({ includeEmpty: false }, () => {
                blankish = false;
              });
              if (blankish) continue;
              // Next section title row
              const first = str(cellVal(sheet.getRow(r).getCell(4))) ||
                str(cellVal(sheet.getRow(r).getCell(5))) ||
                str(cellVal(sheet.getRow(r).getCell(6)));
              if (sectionBreak(first)) break;
            }
            continue;
          }
          if (/\bTOTAL\b/i.test(item) || /stock value/i.test(item)) break;
          const dateRaw = resolveEntryDate(
            getCell(sheet, r, header.map, "date"),
            null,
            sheetDate,
          );
          if (!dateRaw || !(qty != null && qty > 0)) {
            if (!(qty != null && qty > 0)) continue;
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
          const size = str(getCell(sheet, r, header.map, "size"));
          const itemName = size ? `${item} · ${size}` : item;
          result.stock.push({
            row: r,
            date: ymd(dateRaw),
            shift: parseShift(getCell(sheet, r, header.map, "shift")),
            itemName,
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

  // ── Expense / Misc Exp. ────────────────────────────────────────────
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

  // ── Electricity (dedicated or section in combined sheet) ───────────
  {
    const dedicated = findSheet(wb, [
      "Electricity",
      "Electricity & Power",
      "Fuel & Power",
      "Fuel and Power",
    ]);
    const combined = findSheet(wb, ["Electricity, Rent & Stock"]);
    const sheets = [dedicated, combined].filter(
      (s, i, arr): s is ExcelJS.Worksheet =>
        !!s && arr.findIndex((x) => x?.name === s.name) === i,
    );
    for (const sheet of sheets) {
      const start =
        sheet.name.toLowerCase().includes("rent") ||
        sheet.name.toLowerCase().includes("stock")
          ? 10
          : 1;
      const header = findHeaderRow(sheet, ELECTRICITY_ALIASES, 60, start);
      if (!header || header.map.amount == null) continue;
      // Avoid re-using stock header
      if (header.map.quantity != null && header.map.item != null) continue;
      for (let r = header.row + 1; r <= sheet.rowCount; r++) {
        const dateRaw = asUtcDate(getCell(sheet, r, header.map, "date"));
        const amount = num(getCell(sheet, r, header.map, "amount")) ?? 0;
        const opening = num(getCell(sheet, r, header.map, "opening"));
        const closing = num(getCell(sheet, r, header.map, "closing"));
        if (!dateRaw && amount === 0 && opening == null && closing == null) {
          continue;
        }
        const label = str(getCell(sheet, r, header.map, "date"));
        if (/\bTOTAL\b/i.test(label) || sectionBreak(label)) break;
        if (!dateRaw || amount <= 0) continue;
        result.expenses.push({
          row: r,
          date: ymd(dateRaw),
          shift: ManpowerShift.DAY,
          target: "electricity",
          expenseHead: "Electricity",
          nature: null,
          description: str(getCell(sheet, r, header.map, "notes")) || null,
          payMode: "Bank",
          amount,
          contractorSalary: 0,
          supervisorSalary: 0,
          billNumber: null,
          openingReading: opening,
          closingReading: closing,
          vendor: null,
          cost: null,
          gst: null,
          depreciationPercent: null,
          coveredAreaSqft: null,
          rentRatePerSqft: null,
        });
      }
    }
  }

  // ── Rent ───────────────────────────────────────────────────────────
  {
    const dedicated = findSheet(wb, ["Rent", "Factory Rent"]);
    const combined = findSheet(wb, ["Electricity, Rent & Stock"]);
    const sheets = [dedicated, combined].filter(
      (s, i, arr): s is ExcelJS.Worksheet =>
        !!s && arr.findIndex((x) => x?.name === s.name) === i,
    );
    for (const sheet of sheets) {
      const start =
        sheet.name.toLowerCase().includes("electricity") ||
        sheet.name.toLowerCase().includes("stock")
          ? 25
          : 1;
      const header = findHeaderRow(sheet, RENT_ALIASES, 80, start);
      if (!header) continue;
      if (header.map.opening != null || header.map.closing != null) continue;
      for (let r = header.row + 1; r <= sheet.rowCount; r++) {
        const dateRaw = asUtcDate(getCell(sheet, r, header.map, "date"));
        const area = num(getCell(sheet, r, header.map, "area"));
        const rentRate =
          num(getCell(sheet, r, header.map, "rentRate")) ??
          num(getCell(sheet, r, header.map, "rateOnly"));
        let amount = num(getCell(sheet, r, header.map, "amount"));
        if ((amount == null || amount === 0) && area != null && rentRate != null) {
          amount = area * rentRate;
        }
        amount = amount ?? 0;
        if (!dateRaw && amount === 0) continue;
        const label = str(getCell(sheet, r, header.map, "date"));
        if (/\bTOTAL\b/i.test(label)) break;
        if (!dateRaw || amount <= 0) continue;
        result.expenses.push({
          row: r,
          date: ymd(dateRaw),
          shift: ManpowerShift.DAY,
          target: "rent",
          expenseHead: "Factory Rent",
          nature: null,
          description: str(getCell(sheet, r, header.map, "notes")) || null,
          payMode: "Bank",
          amount,
          contractorSalary: 0,
          supervisorSalary: 0,
          billNumber: null,
          openingReading: null,
          closingReading: null,
          vendor: null,
          cost: null,
          gst: null,
          depreciationPercent: null,
          coveredAreaSqft: area,
          rentRatePerSqft: rentRate,
        });
      }
    }
  }

  // ── FAR ────────────────────────────────────────────────────────────
  {
    const sheet = findSheet(wb, ["FAR", "Fixed Assets", "Fixed Asset"]);
    if (sheet) {
      const header = findHeaderRow(sheet, FAR_ALIASES);
      if (!header) {
        result.skipped.push({
          sheet: sheet.name,
          row: 0,
          reason: "No recognizable FAR header row",
        });
      } else {
        for (let r = header.row + 1; r <= sheet.rowCount; r++) {
          const vendor = str(getCell(sheet, r, header.map, "vendor"));
          const description = str(
            getCell(sheet, r, header.map, "description"),
          );
          const cost = num(getCell(sheet, r, header.map, "cost"));
          if (!vendor && !description && (cost == null || cost === 0)) continue;
          if (/\bTOTAL\b/i.test(vendor + description)) break;
          const billDate = asUtcDate(getCell(sheet, r, header.map, "billDate"));
          const dateRaw = resolveEntryDate(
            getCell(sheet, r, header.map, "date"),
            billDate,
            findSheetFallbackDate(sheet),
          );
          if (!dateRaw || !description) {
            if (!description) continue;
            result.skipped.push({
              sheet: sheet.name,
              row: r,
              reason: "Missing date or asset description",
            });
            continue;
          }
          result.expenses.push({
            row: r,
            date: ymd(dateRaw),
            shift: ManpowerShift.DAY,
            target: "far",
            expenseHead: "FAR",
            nature: null,
            description,
            payMode: "Bank",
            amount: 0,
            contractorSalary: 0,
            supervisorSalary: 0,
            billNumber:
              str(getCell(sheet, r, header.map, "billNumber")) || null,
            openingReading: null,
            closingReading: null,
            vendor: vendor || null,
            cost: cost ?? 0,
            gst: num(getCell(sheet, r, header.map, "gst")),
            depreciationPercent: num(
              getCell(sheet, r, header.map, "depPercent"),
            ),
            coveredAreaSqft: null,
            rentRatePerSqft: null,
          });
        }
      }
    }
  }

  // ── Unloading of MT (UPCAST / PVC) ─────────────────────────────────
  {
    const sheet = findSheet(wb, [
      "Unloading of MT",
      "Unloading MT",
      "Unloading",
    ]);
    if (sheet) {
      const aliases: Record<string, string[]> = {
        date: ["date", "payment date", "entry date"],
        quantity: ["quantity mt", "quantity", "qty", "mt"],
        rate: ["rate mt", "rate"],
        paidTo: ["paid to", "payee", "contractor"],
        payMode: ["pay mode", "payment mode", "mode"],
        amount: ["amount", "value"],
        notes: ["remarks", "notes", "remark"],
      };
      const header = findHeaderRow(sheet, aliases);
      if (header) {
        for (let r = header.row + 1; r <= sheet.rowCount; r++) {
          const dateRaw = asUtcDate(getCell(sheet, r, header.map, "date"));
          const qty = num(getCell(sheet, r, header.map, "quantity"));
          const rate = num(getCell(sheet, r, header.map, "rate"));
          let amount = num(getCell(sheet, r, header.map, "amount"));
          if (
            (amount == null || amount === 0) &&
            qty != null &&
            rate != null
          ) {
            amount = qty * rate;
          }
          amount = amount ?? 0;
          if (!dateRaw || amount <= 0) continue;
          const paidTo = str(getCell(sheet, r, header.map, "paidTo"));
          const notes = str(getCell(sheet, r, header.map, "notes"));
          result.expenses.push({
            row: r,
            date: ymd(dateRaw),
            shift: ManpowerShift.DAY,
            target: "petty",
            expenseHead: "Unloading of MT",
            nature: null,
            description:
              [paidTo && `Paid to ${paidTo}`, notes, qty != null && `Qty ${qty} MT`]
                .filter(Boolean)
                .join(" · ") || null,
            payMode: str(getCell(sheet, r, header.map, "payMode")) || "Cash",
            amount,
            contractorSalary: 0,
            supervisorSalary: 0,
            billNumber: null,
            openingReading: null,
            closingReading: null,
            vendor: paidTo || null,
            cost: null,
            gst: null,
            depreciationPercent: null,
            coveredAreaSqft: null,
            rentRatePerSqft: null,
          });
        }
      }
    }
  }

  return result;
}
