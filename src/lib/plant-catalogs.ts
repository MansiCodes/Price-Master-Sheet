import {
  CAT6_CUSTOMERS,
  CAT6_PETTY_APPROVED_BY,
  CAT6_PETTY_CHECKED_BY,
  CAT6_PETTY_LOCATIONS,
  CAT6_PETTY_NATURES,
  CAT6_PETTY_PERSONS,
  CAT6_PURCHASE_GOODS,
  CAT6_SALE_PRODUCTS,
  CAT6_STOCK_ITEMS,
  CAT6_SUPPLIERS,
} from "@/lib/cat6-catalogs";
import { isCat6Plant } from "@/lib/plant-layout";
import { CAT6_STOCK_UNITS } from "@/lib/units";

export const DEFAULT_PURCHASE_GOODS = CAT6_PURCHASE_GOODS;
export const DEFAULT_SUPPLIERS = CAT6_SUPPLIERS;

const PVC_SUPPLIERS = [
  "S.S Industries",
  "Mahalaxmi Enterprises",
  "Techno Polychem",
  "Radhe Radhe Plastic",
  "National Traders",
  "Arihant Wire Industries",
  "D. K. Traders",
  "Rafia Enterprises",
  "S.K. Scrap Traders",
  "UK Traders",
  "Hayat Relife Metal",
  "MADAN CHEMICALS PRIVATE LIMITED",
  "R K Enterprises",
  "S K SCRAP TRADERS",
  "R K ENTERPRISES",
  "HAMJA TRADERS",
  "SUNTEK CHLORIDES Pvt Ltd.",
  "A K ENTERPRISES , KANPUR",
  "S.K. SCRAP TRADERS",
  "Other",
] as const;

const PVC_PURCHASE_GOODS = [
  "Calcium Zinc Stabilizer (CZ-35)",
  "Calcium Powder",
  "Black Carbon",
  "Titanium Dioxide",
  "Pigment Colour-RED",
  "Pigment Colour-BLUE",
  "Chlorinated Paraffin",
  "Stearic Acid",
  "Green Pipe",
  "Pani Pipe",
  "Soft Pvc",
  "Wire Mesh (Roll)",
  "Old Plastic west Scrap (PVC Pipe)",
  "H. Cilies (Waste PVC Scrap)",
  "JHAL Plastic Scrap",
  "Soft Clear Pvc",
  "Pigment Colour-BLACK",
  "PVC SCRAP (Avg. Rate-S. Cliar & Pani Pipe)",
  "CPW",
  "Pigment Colour-Blue",
  "S. CLEAR",
  "JHAAL",
  "H. CLEAR",
  "TITANIUM DIOXIDE",
  "GREEN PIPE",
  "GRINDING WHEEL",
  "Soft Pvc & Pani Pipe",
  "BARDANA",
  "GREEN PIPE & S. CLEAR",
  "S. CLEAR Granding",
  "JHAAL (Ghas Granding)",
  "Pigment Colour (Carbon)",
  "Stearic Acid (Wax/Mom)",
  "BARDANA (Empty Bag)",
  "Ghash Granding",
  "Lump+Cable",
  "Lump+cable",
  "Other",
] as const;

export const PVC_STOCK_PARTICULARS = [
  "CPW",
  "Thermal",
  "Calcium",
  "Titanium Di Oxide",
  "WAX/MOM",
  "Carbon",
  "Other Colors (Red)",
  "Other Colors (Blue)",
  "Pani Pipe",
  "Green Pipe",
  "S. Cilies",
  "Lump+Cable",
  "H. Cilies",
  "JHAL Plastic Scrap",
  "Other",
] as const;

export const STOCK_CATEGORIES = ["RM", "WIP", "FG", "Other"] as const;

/** Notes prefix for inventory snapshot rows (P&L Opening / Closing Stock). */
export const STOCK_CLOSING_NOTE_PREFIX = "Closing stock";

/** Notes prefix for material received from ATCL (P&L → Stock Taken from ATCL). */
export const STOCK_ATCL_NOTE_PREFIX = "Stock from ATCL";

export const PVC_STOCK_ENTRY_TYPES = [
  { value: "closing", label: "Closing stock snapshot" },
] as const;

export type PvcStockEntryType = (typeof PVC_STOCK_ENTRY_TYPES)[number]["value"];

/** Default notes tag for a PVC stock row when remarks are blank. */
export function pvcStockEntryNotes(
  _entryType: PvcStockEntryType,
  date: string,
  customNotes?: string | null,
): string {
  const custom = customNotes?.trim();
  if (custom) return custom;
  return `${STOCK_CLOSING_NOTE_PREFIX} as on ${date}`;
}

/** Prisma filter: stock inward from ATCL (explicit tag + legacy non-closing imports). */
export function atclStockEntryFilter() {
  return {
    OR: [
      { notes: { startsWith: STOCK_ATCL_NOTE_PREFIX } },
      {
        AND: [
          { notes: { not: null } },
          { NOT: { notes: { startsWith: STOCK_CLOSING_NOTE_PREFIX } } },
        ],
      },
    ],
  };
}

export function closingStockEntryFilter() {
  return { notes: { startsWith: STOCK_CLOSING_NOTE_PREFIX } };
}

export function getStockCatalog(plantCode: string): {
  particulars: readonly string[];
  defaultUnit: string;
  units: readonly string[];
} {
  if (isCat6Plant(plantCode)) {
    return {
      particulars: [...CAT6_STOCK_ITEMS, ...CAT6_PURCHASE_GOODS],
      defaultUnit: "NOS",
      units: CAT6_STOCK_UNITS,
    };
  }
  if (plantCode.toUpperCase() === "PVC") {
    return {
      particulars: PVC_STOCK_PARTICULARS,
      defaultUnit: "KGS",
      units: ["PCS", "KGS", "NOS", "KM", "MTR", "COIL", "ROLL"],
    };
  }

  return {
    particulars: DEFAULT_PURCHASE_GOODS,
    defaultUnit: "kg",
    units: ["kg"],
  };
}

export function getPurchaseCatalog(plantCode: string): {
  suppliers: readonly string[];
  goods: readonly string[];
} {
  if (plantCode.toUpperCase() === "PVC") {
    return {
      suppliers: PVC_SUPPLIERS.includes("Other" as any) ? PVC_SUPPLIERS : [...PVC_SUPPLIERS, "Other"],
      goods: PVC_PURCHASE_GOODS.includes("Other" as any) ? PVC_PURCHASE_GOODS : [...PVC_PURCHASE_GOODS, "Other"],
    };
  }

  return {
    suppliers: DEFAULT_SUPPLIERS.includes("Other" as any) ? DEFAULT_SUPPLIERS : [...DEFAULT_SUPPLIERS, "Other"],
    goods: DEFAULT_PURCHASE_GOODS.includes("Other" as any) ? DEFAULT_PURCHASE_GOODS : [...DEFAULT_PURCHASE_GOODS, "Other"],
  };
}

export function getSalesCatalog(plantCode: string): readonly string[] {
  if (isCat6Plant(plantCode)) return CAT6_SALE_PRODUCTS;
  if (plantCode?.toUpperCase() === "SIGNALLING") {
    return [
      "Signalling Cable 1.5 sq mm",
      "Signalling Cable 2.5 sq mm",
      "Signalling Cable 4 sq mm",
      "Signalling Cable 6 sq mm",
      "RDSO Black",
      "RDSO Grey",
      "Other",
    ];
  }
  return [
    "RDSO Black",
    "RDSO Grey",
    "Other",
  ];
}

export function getCat6PettyCatalog(): {
  natures: readonly string[];
  persons: readonly string[];
  locations: readonly string[];
  checkedBy: readonly string[];
  approvedBy: readonly string[];
} {
  return {
    natures: CAT6_PETTY_NATURES,
    persons: CAT6_PETTY_PERSONS,
    locations: CAT6_PETTY_LOCATIONS,
    checkedBy: CAT6_PETTY_CHECKED_BY,
    approvedBy: CAT6_PETTY_APPROVED_BY,
  };
}

export function getCustomerCatalog(plantCode: string): readonly string[] {
  if (isCat6Plant(plantCode)) return CAT6_CUSTOMERS;
  if (plantCode?.toUpperCase() === "PVC") {
    return ["ATCL", "Other"];
  }
  if (plantCode?.toUpperCase() === "SIGNALLING") {
    return [
      "Indian Railways",
      "RDSO",
      "ATCL",
      "Wirelux",
      "Samriddhi Automation Noida",
      "Other",
    ];
  }
  return [
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
    "Other",
  ];
}

/** PVC expense categories aligned with P&L indirect/direct lines. */
export const PVC_EXPENSE_SECTIONS = [
  { value: "direct", label: "Direct Expense" },
  { value: "indirect", label: "Indirect Expense" },
] as const;

export type PvcExpenseSection =
  (typeof PVC_EXPENSE_SECTIONS)[number]["value"];

/** Direct expenses (P&L trading account). */
export const PVC_DIRECT_EXPENSE_HEADS = [
  "Fuel & Power",
  "Labour Contractor",
  "Expense",
  "Other",
] as const;

/** Indirect expenses (P&L below gross profit). */
export const PVC_INDIRECT_EXPENSE_HEADS = [
  "Petty Cash",
  "Salary Expenses",
  "Depreciation (FAR)",
  "Financial Cost",
  "Factory Rent",
  "Transport",
  "Miscellaneous",
] as const;

export const PVC_EXPENSE_HEADS = [
  ...PVC_DIRECT_EXPENSE_HEADS,
  ...PVC_INDIRECT_EXPENSE_HEADS,
] as const;

/** @deprecated use PVC_DIRECT/INDIRECT_EXPENSE_HEADS */
export const PVC_LEGACY_EXPENSE_HEADS = PVC_EXPENSE_HEADS;

/**
 * CAT-6 expense UI mirrors Direct / Indirect.
 * Direct Petty Cash → P&L PETTY CASH EXP (trading / direct side).
 * Direct Other / Indirect Salary & Wages / Miscellaneous → WAGES & SALARY EXP.
 */
export const CAT6_DIRECT_EXPENSE_HEADS = ["Petty Cash", "Other"] as const;

export const CAT6_INDIRECT_EXPENSE_HEADS = [
  "Salary & Wages",
  "Miscellaneous",
] as const;

export const CAT6_EXPENSE_HEADS = [
  ...CAT6_DIRECT_EXPENSE_HEADS,
  ...CAT6_INDIRECT_EXPENSE_HEADS,
] as const;

/** LED Rope — same Direct/Indirect pattern as other plants. */
export const LED_DIRECT_EXPENSE_HEADS = ["Other"] as const;

export const LED_INDIRECT_EXPENSE_HEADS = [
  "Salary & Wages",
  "Miscellaneous",
] as const;

export const LED_EXPENSE_HEADS = [
  ...LED_DIRECT_EXPENSE_HEADS,
  ...LED_INDIRECT_EXPENSE_HEADS,
] as const;

/** @deprecated prefer plant-specific heads / getExpenseHeadsForSection */
export const DEFAULT_EXPENSE_HEADS = CAT6_EXPENSE_HEADS;

export const PVC_FAR_VENDORS = [
  "Choudhary Enterprises",
  "Perfect Traders",
  "Other",
] as const;

export const PVC_FAR_DEP_PERCENT = 18.1;

/** Default unloading rate used when user leaves rate blank (Excel G156). */
export const PVC_UNLOADING_RATE_PER_MT = 70;

export function getPvcExpenseHeadsForSection(
  section: PvcExpenseSection,
): readonly string[] {
  return section === "direct"
    ? PVC_DIRECT_EXPENSE_HEADS
    : PVC_INDIRECT_EXPENSE_HEADS;
}

export function getExpenseHeadsForSection(
  plantCode: string | null | undefined,
  section: PvcExpenseSection,
): readonly string[] {
  const code = plantCode?.toUpperCase() ?? "";
  if (code === "PVC") return getPvcExpenseHeadsForSection(section);
  if (code === "CAT6") {
    return section === "direct"
      ? CAT6_DIRECT_EXPENSE_HEADS
      : CAT6_INDIRECT_EXPENSE_HEADS;
  }
  if (code === "LEDROPE" || code === "SIGNALLING") {
    return section === "direct"
      ? LED_DIRECT_EXPENSE_HEADS
      : LED_INDIRECT_EXPENSE_HEADS;
  }
  return section === "direct"
    ? LED_DIRECT_EXPENSE_HEADS
    : LED_INDIRECT_EXPENSE_HEADS;
}

/** All plants use Direct / Indirect expense UI. */
export function usesExpenseSections(
  _plantCode?: string | null,
): boolean {
  return true;
}

export function pvcExpenseSection(head: string): PvcExpenseSection {
  const normalized = normalizePvcExpenseHead(head);
  if (
    (PVC_DIRECT_EXPENSE_HEADS as readonly string[]).includes(normalized) ||
    normalized === "Electricity"
  ) {
    return "direct";
  }
  return "indirect";
}

export function expenseSectionForPlant(
  plantCode: string | null | undefined,
  head: string,
): PvcExpenseSection {
  const code = plantCode?.toUpperCase() ?? "";
  if (code === "PVC") return pvcExpenseSection(head);
  if (code === "CAT6") {
    const normalized = head.trim();
    if (
      (CAT6_DIRECT_EXPENSE_HEADS as readonly string[]).includes(normalized)
    ) {
      return "direct";
    }
    return "indirect";
  }
  if (code === "LEDROPE" || code === "SIGNALLING") {
    const normalized = head.trim();
    if (
      (LED_DIRECT_EXPENSE_HEADS as readonly string[]).includes(normalized)
    ) {
      return "direct";
    }
    return "indirect";
  }
  return head.trim() === "Other" ? "direct" : "indirect";
}

export function getPvcExpenseHeads(): readonly string[] {
  return PVC_EXPENSE_HEADS;
}

/** Expense category buttons for a plant (P&L Expense tab + Today form). */
export function getExpenseHeads(plantCode?: string | null): readonly string[] {
  const code = plantCode?.toUpperCase() ?? "";
  if (code === "PVC") return PVC_EXPENSE_HEADS;
  if (code === "CAT6") return CAT6_EXPENSE_HEADS;
  if (code === "LEDROPE" || code === "SIGNALLING") return LED_EXPENSE_HEADS;
  return DEFAULT_EXPENSE_HEADS;
}

/** Maps PVC expense category to the matching P&L line label. */
export function pvcExpensePnlLine(head: string): string {
  switch (normalizePvcExpenseHead(head)) {
    case "Electricity":
    case "Fuel & Power":
      return "FUEL & POWER EXP.";
    case "Factory Rent":
      return "FACTORY RENT";
    case "FAR":
    case "Depreciation (FAR)":
      return "DEPRECIATION";
    case "Financial Cost":
      return "FINANCIAL COST";
    case "Unloading of MT":
    case "Unloading MT":
      return "UNLOADING EXP.";
    case "Labour Contractor":
      return "LABOUR CONTRACTOR";
    case "Expense":
    case "Other":
      return "DIRECT EXP.";
    case "Petty Cash":
      return "PETTY CASH EXP";
    case "Salary Expenses":
      return "SALARY EXPENSES";
    case "Transport":
    case "Miscellaneous":
    case "Maintenance":
    case "Office":
      return "INDIRECT EXP.";
    default:
      return head;
  }
}

/** CAT-6 expense → P&L line. */
export function cat6ExpensePnlLine(head: string): string {
  switch (head.trim()) {
    case "Petty Cash":
      return "PETTY CASH EXP";
    case "Other":
    case "Salary & Wages":
    case "Miscellaneous":
    case "Electricity":
    case "Transport":
    case "Maintenance":
    case "Office":
      return "WAGES & SALARY EXP";
    default:
      return "WAGES & SALARY EXP";
  }
}

/** Normalize legacy expense labels to current catalog names. */
export function normalizePvcExpenseHead(head: string): string {
  const h = head.trim();
  if (h === "Electricity") return "Fuel & Power";
  if (h === "FAR") return "Depreciation (FAR)";
  if (h === "Unloading MT") return "Unloading of MT";
  return h;
}

/** ATCL inward stock is captured in Purchase (Excel Inward Stock Register). */
export const PVC_ATCL_VENDOR_NAME = "ATCL";
export const PVC_ATCL_PURCHASE_NOTE_PREFIX = "Stock from ATCL";

export function isAtclPurchase(row: {
  vendorName?: string | null;
  notes?: string | null;
}): boolean {
  const vendor = row.vendorName?.trim().toUpperCase() ?? "";
  const notes = row.notes?.trim() ?? "";
  return (
    vendor === PVC_ATCL_VENDOR_NAME ||
    vendor.includes("ATCL") ||
    notes.startsWith(PVC_ATCL_PURCHASE_NOTE_PREFIX)
  );
}
