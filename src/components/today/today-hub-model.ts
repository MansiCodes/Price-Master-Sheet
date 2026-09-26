import type { Dispatch, SetStateAction } from "react";
import type { InsulationLengthUnit } from "@/lib/quad-signal-wip";
import { STOCK_CATEGORIES } from "@/lib/plant-catalogs";

export type TodayModuleKey =
  | "purchaseFilled"
  | "saleFilled"
  | "stockFilled"
  | "productionFilled"
  | "pettyCashFilled";

export type TodayModuleStatus = {
  key: TodayModuleKey;
  label: string;
  filled: boolean;
  done?: number;
  total?: number;
};

export type ShiftKey = "DAY" | "NIGHT";

export type ShiftModulesMap = Record<ShiftKey, TodayModuleStatus[]>;

export type EntryKind =
  | "purchase"
  | "sale"
  | "stock"
  | "expense"
  | "contactList";

export type LineItem = {
  id: string;
  itemDescription: string;
  unit: string;
  quantity: string;
  rate: string;
  gstPercent: string;
  inMeter?: string;
  qtyMtr?: string;
  meterUnit?: string;
  openingReading?: string;
  closingReading?: string;
  debitQuantity?: string;
};

export type SaleTypeValue =
  | (typeof SALE_TYPES)[number]["value"]
  | (typeof CONDUCTOR_SALE_TYPES)[number]["value"];

export type PurchaseTypeValue = (typeof PURCHASE_TYPES)[number]["value"];

export type TodayHubProps = {
  plantId: string;
  plantName: string;
  plantCode: string;
  date: string;
  shiftModules: ShiftModulesMap;
  canEnter: boolean;
  /** When true, hide plant hero — parent Dashboard already shows it. */
  embedded?: boolean;
  /** Render only the entry slide-over (used by global header on non-dashboard pages). */
  overlayOnly?: boolean;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  /** Used to limit entry kinds (e.g. accountants → purchase + sales only). */
  userRole?: string;
  /** Machine Supervisor Extra Stock → Today's Entry stock only. */
  canAccessStock?: boolean;
};

export type StockInsulationExtra = {
  id: string;
  size: string;
  sizeOther: string;
  lengthValue: string;
  lengthUnit: InsulationLengthUnit;
  lengthUnitOther: string;
  layingProduced: string;
};

export type StockSingleQuadExtra = {
  id: string;
  size: string;
  sizeOther: string;
  singleQuadProd: string;
  layingProduced: string;
};

export type StockCallPutupItem = {
  qty: string;
  date: string;
  partyName: string;
};

export type StockDispatchPendingItem = {
  qty: string;
  partyName: string;
};

export type StockWipSalesLine = {
  id: string;
  billNumber: string | null;
  customerName: string;
  itemDescription: string;
  quantity: number;
  unit: string;
};

export const MODULE_ICONS: Record<TodayModuleKey, { path: string; tone: "teal" }> =
  {
    purchaseFilled: {
      tone: "teal",
      path: "M3 5h2l1.6 9.6a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6M9 20a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 9 20Zm8 0a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 17 20Z",
    },
    saleFilled: {
      tone: "teal",
      path: "M3 17l6-6 4 4 8-8M15 7h6v6",
    },
    stockFilled: {
      tone: "teal",
      path: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z M3.3 7 12 12l8.7-5 M12 22V12",
    },
    productionFilled: {
      tone: "teal",
      path: "M3 21V10l6-4v4l6-4v15M15 21V12l6 3v6M3 21h18",
    },
    pettyCashFilled: {
      tone: "teal",
      path: "M3 7h18v11H3V7Zm0 0 2-3h14l2 3M15 12.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
    },
  };

export const MODULE_KIND: Partial<Record<TodayModuleKey, EntryKind>> = {
  purchaseFilled: "purchase",
  saleFilled: "sale",
  stockFilled: "stock",
  pettyCashFilled: "expense",
};

export const KIND_TO_MODULE: Partial<Record<EntryKind, TodayModuleKey>> = {
  purchase: "purchaseFilled",
  sale: "saleFilled",
  stock: "stockFilled",
  expense: "pettyCashFilled",
  // Petty cash does not mark the Expense circle — only Expense entries do.
};

export const ENTRY_KINDS: EntryKind[] = [
  "purchase",
  "sale",
  "stock",
  "expense",
  "contactList",
];

export const ENTRY_KIND_LABEL_KEY: Record<EntryKind, string> = {
  purchase: "purchase",
  sale: "sales",
  stock: "stock",
  expense: "expense",
  contactList: "contactList",
};

export const CUSTOMERS = [
  "Noto Fire",
  "Wirelux",
  "Samriddhii Automation Haridwar",
  "Samriddhi Automation Noida",
  "Railway PO ATC",
  "Hamsa India",
  "Peak Star Networking",
  "Glow Right",
  "Ayansh Infocom",
  "Qlo Networks",
  "Anu Exterprises",
  "Digamber Telecom",
  "Naitik Infotex",
  "Bharat Cable Industries",
  "Goa Shipping Yard",
  "Reliable securities",
  "Chrome Infra",
  "Epsillon Cable",
] as const;

export const SALE_TYPES = [
  { value: "FINISHED_GOOD", label: "Finished Good" },
  { value: "ALUMINIUM_SCRAP", label: "Aluminium Scrap" },
  { value: "COPPER_SCRAP", label: "Copper Scrap" },
  { value: "OTHERS", label: "Others" },
] as const;

/** Conductor plant — sales Type dropdown (enum values reused). */
export const CONDUCTOR_SALE_TYPES = [
  { value: "COPPER_SCRAP", label: "Copper" },
  { value: "ALUMINIUM_SCRAP", label: "Aluminum" },
  { value: "OTHERS", label: "Other" },
] as const;

export const PURCHASE_TYPES = [
  { value: "CONSUMABLE", label: "Consumable" },
  { value: "ASSET", label: "Asset" },
  { value: "CAPITAL_GOOD", label: "Capital Good" },
  { value: "RAW_MATERIAL", label: "Raw materials" },
  { value: "OTHERS", label: "Others" },
] as const;

export const PRODUCTS = [
  { name: "RDSO Black", unit: "KGS" },
  { name: "RDSO Grey", unit: "KGS" },
] as const;

export const PRODUCT_NAMES = PRODUCTS.map((p) => p.name);

export const STOCK_CATEGORIES_OPTIONS = [...STOCK_CATEGORIES] as const;

export function newLine(unit = "Kg", itemDescription = ""): LineItem {
  return {
    id: crypto.randomUUID(),
    itemDescription,
    unit,
    quantity: "",
    rate: "",
    gstPercent: "18",
    inMeter: "",
    qtyMtr: "",
    meterUnit: "",
    openingReading: "",
    closingReading: "",
    debitQuantity: "",
  };
}

export async function fetchStockPurchaseRate(
  plantId: string,
  itemName: string,
  date: string,
): Promise<number | null> {
  const qs = new URLSearchParams({ itemName, date });
  const res = await fetch(`/api/plants/${plantId}/stock/average-rate?${qs}`);
  const json = (await res.json()) as { rate?: number | null };
  if (!res.ok) return null;
  return json.rate != null && Number.isFinite(json.rate) ? json.rate : null;
}

export function moduleScore(mod: TodayModuleStatus) {
  return `${mod.done ?? (mod.filled ? 1 : 0)}/${mod.total ?? 1}`;
}

export function rememberCustomOption(
  setter: Dispatch<SetStateAction<string[]>>,
  value: string | null | undefined,
) {
  const v = (value ?? "").trim();
  if (!v || /^(other|others)$/i.test(v)) return;
  setter((prev) => (prev.includes(v) ? prev : [...prev, v]));
}
