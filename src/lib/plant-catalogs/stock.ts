import {
  CAT6_PURCHASE_GOODS,
  CAT6_STOCK_ITEMS,
} from "@/lib/cat6-catalogs";
import { isCat6Plant, isQuadSignalPlant } from "@/lib/plant-layout";
import { getPlantSegment } from "@/lib/plant-segments";
import { CAT6_STOCK_UNITS } from "@/lib/units";
import { DEFAULT_PURCHASE_GOODS } from "./cat6";
import { CONDUCTOR_STOCK_ITEMS, CONDUCTOR_STOCK_SIZES } from "./conductor";
import { PVC_STOCK_PARTICULARS } from "./pvc";
import { QUAD_SIGNAL_STOCK_RAW_MATERIALS } from "./quad-signal-materials";
import {
  STOCK_ATCL_NOTE_PREFIX,
  STOCK_CLOSING_NOTE_PREFIX,
} from "./stock-note-prefixes";
import { UPCAST_STOCK_PREFIX } from "./upcast";

export {
  STOCK_ATCL_NOTE_PREFIX,
  STOCK_CATEGORIES,
  STOCK_CLOSING_NOTE_PREFIX,
} from "./stock-note-prefixes";

export const PVC_STOCK_ENTRY_TYPES = [
  { value: "closing", label: "Closing stock snapshot" },
] as const;

export type PvcStockEntryType = (typeof PVC_STOCK_ENTRY_TYPES)[number]["value"];

/** Label for Stock report / approvals from notes tag. */
export function stockEntryTypeLabel(notes?: string | null): string {
  const n = notes?.trim() ?? "";
  if (n.startsWith(STOCK_CLOSING_NOTE_PREFIX) || n.startsWith(UPCAST_STOCK_PREFIX))
    return "Closing stock";
  if (n.startsWith("Issued quantity")) return "Issued quantity";
  return "—";
}

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
  sizes?: readonly string[];
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

  if (plantCode.toUpperCase() === "UPCAST") {
    return {
      particulars: [
        "Copper Scrap / Burr",
        "Copper Cathode",
        "CC Copper Rod 8 mm",
        "1.6mm Wire",
        "Fine Wire",
        "Super Fine Wire",
        "DORI",
        "STRIP",
        "RASSA",
        "PIPE",
        "Other",
      ],
      defaultUnit: "KGS",
      units: ["KGS", "PCS", "NOS", "MT"],
    };
  }

  if (isQuadSignalPlant(plantCode)) {
    return {
      particulars: QUAD_SIGNAL_STOCK_RAW_MATERIALS,
      defaultUnit: "KGS",
      units: ["PCS", "KGS", "NOS", "KM", "MTR", "COIL", "ROLL"],
    };
  }

  if (plantCode.toUpperCase() === "CONDUCTOR") {
    return {
      particulars: CONDUCTOR_STOCK_ITEMS,
      defaultUnit: "KGS",
      units: ["PCS", "KGS", "NOS", "KM", "MTR", "COIL", "ROLL"],
      sizes: CONDUCTOR_STOCK_SIZES,
    };
  }

  const segment = getPlantSegment(plantCode);
  if (segment) {
    const particulars = [
      ...segment.rawMaterials.map((i) => i.name),
      ...segment.finalProducts.map((i) => i.name),
      "Other",
    ];
    const code = plantCode.toUpperCase();
    const units =
      code === "SLSSL"
        ? (["PCS", "PACKET", "KGS", "NOS", "KM", "MTR", "COIL", "ROLL"] as const)
        : (["PCS", "KGS", "NOS", "KM", "MTR", "COIL", "ROLL"] as const);
    return {
      particulars,
      defaultUnit: "KGS",
      units,
    };
  }

  return {
    particulars: DEFAULT_PURCHASE_GOODS,
    defaultUnit: "kg",
    units: ["kg"],
  };
}
