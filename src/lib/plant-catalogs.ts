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
import { isCat6Plant, isQuadSignalPlant } from "@/lib/plant-layout";
import { getPlantSegment } from "@/lib/plant-segments";
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

/** Conductor plant — purchase supplier name dropdown. */
const CONDUCTOR_SUPPLIERS = [
  "Metatech CCR",
  "Yatharth",
  "Shreeram Nexa",
  "Bhawani",
  "Other",
] as const;

/** Conductor plant — purchase description dropdown. */
const CONDUCTOR_PURCHASE_GOODS = [
  "Copper rod 8 mm",
  "Others",
] as const;

/** Conductor plant — sales customer dropdown. */
const CONDUCTOR_CUSTOMERS = [
  "Quad + Signal",
  "CAT6",
  "PIJF",
  "FS Cable",
  "FA Cable",
  "Power Cable",
  "Signal Core",
  "Multi core",
  "Others",
] as const;

/** Conductor plant — sales conductor size dropdown (order fixed). */
export const CONDUCTOR_SALE_SIZES = [
  "1.4mm",
  "0.9mm",
  "1.8mm",
  "0.475mm",
  "0.445mm",
  "0.425mm",
  "0.457mm",
  "0.625mm",
  "0.62mm",
  "0.5mm",
  "0.495mm",
  "0.2mm",
  "0.3mm",
  "0.4mm",
  "0.45mm",
  "0.6mm",
  "1mm",
  "0.85mm",
  "others",
] as const;

/** Conductor plant — stock size dropdown (8mm first, then sales sizes). */
export const CONDUCTOR_STOCK_SIZES = [
  "8mm",
  ...CONDUCTOR_SALE_SIZES,
] as const;

/** Conductor plant — stock item dropdown. */
const CONDUCTOR_STOCK_ITEMS = [
  "copper",
  "aluminium",
  "wire drawing lubricant",
  "copper scrap",
  "GADH",
  "others",
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

/** Quad & Signal plant — raw materials (purchase description dropdown). */
export const QUAD_RAW_MATERIALS = [
  "COPPER",
  "HDPE",
  "P.E.M.B",
  "P.P BINDER",
  "POLYESTER TAPE",
  "DUMMY",
  "FILLING JELLY",
  "POLYAL TAPE",
  "FLOODING JELLY",
  "HOT MELT GLUE",
  "LDPE (I/S)",
  "ALUMINIUM STRIP",
  "B.C. TAPE",
  "PVC GREY (SHEATH)",
  "GAL. STEEL TAPE ZN",
  "GAL. STEEL TAPE NZN",
  "PVC BLACK (O/S)",
  "DRUM",
  "Other",
] as const;

/** Quad plant — vendors mapped to each raw material (without "Other"). */
export const QUAD_RAW_MATERIAL_VENDORS: Record<string, readonly string[]> = {
  COPPER: ["Metatech CCR", "Yatharth", "Shreeram Nexa", "Bhawani"],
  HDPE: ["BLS", "Vijay Plastic", "3R Polymer"],
  "P.E.M.B": ["Sag Polymer"],
  "P.P BINDER": ["Agarwal Insulation", "Bells Insulation"],
  "POLYESTER TAPE": ["Agarwal Insulation", "Bells Insulation", "PC Lamination"],
  DUMMY: ["Vinpol", "Shiv Industries"],
  "FILLING JELLY": ["Coral Petro", "BLS"],
  "POLYAL TAPE": ["PC Lamination", "Bells Insulation"],
  "FLOODING JELLY": ["Petrolgel"],
  "HOT MELT GLUE": ["Paraglu"],
  "LDPE (I/S)": ["Vinpol", "Shiv Industries"],
  "ALUMINIUM STRIP": ["Wire House"],
  "B.C. TAPE": ["Agarwal Insulation", "Bells Insulation"],
  "PVC GREY (SHEATH)": ["In House PVC Plant"],
  "GAL. STEEL TAPE ZN": ["Bhusan Steel"],
  "GAL. STEEL TAPE NZN": ["Jain Iron", "Power Steel", "Bansal"],
  "PVC BLACK (O/S)": ["In House PVC Plant"],
  DRUM: [
    "Aggarwal Industries",
    "Paras Industries",
    "Right Choice",
    "SS Industries",
    "Bharat Packers",
  ],
};

/** Quad + Signal — stock Raw Materials (non-cable leftovers). */
export const QUAD_SIGNAL_STOCK_RAW_MATERIALS = [
  "RDSO Black",
  "RDSO Grey",
  "Copper Conductor",
  "Copper Wire (fine gauge)",
  "PVC Insulation Compound",
  "PE / Foam PE Insulation",
  "PVC Outer Sheath Compound",
  "PVC Outer Sheath",
  "Filler / Binder",
  "Star-quad Filler / Binder",
  "Masterbatch (Black / Grey)",
  "Screening / Armour (if applicable)",
  "COPPER",
  "HDPE",
  "P.E.M.B",
  "P.P BINDER",
  "POLYESTER TAPE",
  "DUMMY",
  "FILLING JELLY",
  "POLYAL TAPE",
  "FLOODING JELLY",
  "HOT MELT GLUE",
  "LDPE (I/S)",
  "ALUMINIUM STRIP",
  "B.C. TAPE",
  "PVC GREY (SHEATH)",
  "GAL. STEEL TAPE ZN",
  "GAL. STEEL TAPE NZN",
  "PVC BLACK (O/S)",
  "DRUM",
  "Other",
] as const;

/** Quad + Signal — Cable type dropdown. */
export const QUAD_SIGNAL_STOCK_CABLES = [
  "Signalling Cable",
  "Power Cable",
  "Indoor Multi-Core Cable",
  "Indoor Single-Core Cable",
  "Fire Survival Cable",
  "Quad Cable",
  "PIJF Cable",
  "Other",
] as const;

const SIGNALLING_CABLE_SIZES = [
  "2 Core x 2.5 sqmm",
  "6 Core x 1.5 sqmm",
  "12 Core x 1.5 sqmm",
  "18 Core x 1.5 sqmm",
  "19 Core x 1.5 sqmm",
  "24 Core x 1.5 sqmm",
  "30 Core x 1.5 sqmm",
  "12 Core x 2.5 sqmm",
  "Other",
] as const;

const POWER_CABLE_SIZES = [
  "2 Core x 10 sqmm",
  "2 Core x 25 sqmm",
  "2 Core x 35 sqmm",
  "2 Core x 70 sqmm",
  "Other",
] as const;

const INDOOR_MULTI_CORE_SIZES = [
  "40 Core x 0.6mm",
  "60 Core x 0.6mm",
  "40 Core x 1.0mm",
  "60 Core x 1.0mm",
  "24 Core x 0.6mm",
  "24 Core x 1.0mm",
  "Other",
] as const;

const INDOOR_SINGLE_CORE_SIZES = [
  "16/0.2 mm ABC",
  "16/0.2 mm ATC",
  "0.75 sqmm (24/0.2mm)",
  "1.5 sqmm (22/0.3mm)",
  "28/0.3mm",
  "2.5 sqmm (36/0.3mm)",
  "4 Sqmm",
  "6 Sqmm",
  "10 Sqmm",
  "16 Sqmm",
  "25 Sqmm",
  "35 Sqmm",
  "50 Sqmm",
  "3/0.75 mm",
  "7/0.75 mm",
  "1mm ATC",
  "0.6mm ATC",
  "16/0.2 mm Twin Twisted",
  "Other",
] as const;

const FIRE_SURVIVAL_SIZES = [
  "2 Core x 1.5 sqmm Armoured",
  "2 Core x 1.5 sqmm un-Armoured",
  "Other",
] as const;

const QUAD_CABLE_SIZES = [
  "6 Quad x 0.9mm",
  "4 Quad x 0.9mm",
  "Other",
] as const;

const PIJF_CABLE_SIZES = [
  "10P x 0.5mm Unamoured",
  "10P x 0.9mm Armoured",
  "20P x 0.9mm Unamoured",
  "20P x 0.9mm Armoured",
  "10P x 0.9mm Un-Armoured",
  "5P x 0.5mm Unamoured",
  "2P x 0.5mm Unamoured",
  "20P x 0.5mm Armoured",
  "Other",
] as const;

/** Sizes by cable type (always includes Other). */
export const QUAD_SIGNAL_CABLE_SIZES: Record<string, readonly string[]> = {
  "Signalling Cable": SIGNALLING_CABLE_SIZES,
  "Power Cable": POWER_CABLE_SIZES,
  "Indoor Multi-Core Cable": INDOOR_MULTI_CORE_SIZES,
  "Indoor Single-Core Cable": INDOOR_SINGLE_CORE_SIZES,
  "Fire Survival Cable": FIRE_SURVIVAL_SIZES,
  "Quad Cable": QUAD_CABLE_SIZES,
  "PIJF Cable": PIJF_CABLE_SIZES,
  Other: ["Other"],
};

/** Signalling: Insulation → Laying → Inner Sheath → DST → Outer Sheath (TJ Sir). */
const SIGNALLING_PROCESSES = [
  "Insulation",
  "Laying",
  "Inner Sheath",
  "DST",
  "Outer Sheath",
] as const;

/** Quad: Insulation → Single Quad → Laying → Inner → Screening → Intermediate → DST → Outer (TJ Sir). */
const QUAD_PROCESSES = [
  "Insulation",
  "Single Quad",
  "Laying",
  "Inner",
  "Screening",
  "Intermediate",
  "DST",
  "Outer",
] as const;

const POWER_PROCESSES = [
  "Insulation",
  "Laying",
  "Inner Sheath",
  "Outer Sheath",
  "Armouring",
] as const;

const SINGLE_CORE_PROCESSES = [
  "Insulation",
  "Laying",
  "Outer Sheath",
] as const;

/** Manual process qty columns by cable type. */
export const QUAD_SIGNAL_CABLE_PROCESSES: Record<string, readonly string[]> = {
  "Signalling Cable": SIGNALLING_PROCESSES,
  "Power Cable": POWER_PROCESSES,
  "Indoor Multi-Core Cable": SIGNALLING_PROCESSES,
  "Indoor Single-Core Cable": SINGLE_CORE_PROCESSES,
  "Fire Survival Cable": POWER_PROCESSES,
  "Quad Cable": QUAD_PROCESSES,
  "PIJF Cable": QUAD_PROCESSES,
  Other: SINGLE_CORE_PROCESSES,
};

export function getQuadSignalCableSizes(cable: string): readonly string[] {
  return QUAD_SIGNAL_CABLE_SIZES[cable] ?? ["Other"];
}

export function getQuadSignalCableProcesses(cable: string): readonly string[] {
  return QUAD_SIGNAL_CABLE_PROCESSES[cable] ?? SINGLE_CORE_PROCESSES;
}

export type QuadSignalStockMeta = {
  /** v1 = legacy process snapshot; v2 = production + WIP closing snapshot. */
  v: 1 | 2;
  kind: "raw" | "cable";
  cable?: string;
  size?: string;
  /** Legacy (v1) or alias: treated as closing when opening/closing absent. */
  processes?: Record<string, number>;
  /** Today's production by process (v2). */
  production?: Record<string, number>;
  opening?: Record<string, number>;
  closing?: Record<string, number>;
  /** Finished-stock sales km summed from Sales ledger (v2). */
  salesKm?: number;
  calcSnapshot?: {
    coreCount: number;
    lengthFactor: number;
    layingProduced: number;
    insulationConsumed: number;
    salesKm: number;
    drumLabel?: string;
  };
  /**
   * Signalling Cable only: Insulation is one pool across sizes.
   * Extra size rows contribute laying×cores×factor to the shared deduction.
   */
  sharedInsulation?: {
    consumed: number;
    closing: number;
    contributions: Array<{
      size: string;
      layingProduced: number;
      coreCount: number;
      lengthFactor: number;
      consumed: number;
    }>;
  };
};

const QS_STOCK_PREFIX = "QSSTOCK:";

export function encodeQuadSignalStockNotes(
  meta: QuadSignalStockMeta,
  userNotes?: string | null,
): string {
  const payload = `${QS_STOCK_PREFIX}${JSON.stringify(meta)}`;
  const extra = userNotes?.trim();
  return extra ? `${payload}\n${extra}` : payload;
}

export function parseQuadSignalStockNotes(notes: string | null | undefined): {
  meta: QuadSignalStockMeta | null;
  userNotes: string;
} {
  const raw = notes?.trim() ?? "";
  if (!raw.startsWith(QS_STOCK_PREFIX)) {
    return { meta: null, userNotes: raw };
  }
  const rest = raw.slice(QS_STOCK_PREFIX.length);
  const nl = rest.indexOf("\n");
  const jsonPart = nl >= 0 ? rest.slice(0, nl) : rest;
  const userNotes = nl >= 0 ? rest.slice(nl + 1).trim() : "";
  try {
    const meta = JSON.parse(jsonPart) as QuadSignalStockMeta;
    if (
      (meta?.v === 1 || meta?.v === 2) &&
      (meta.kind === "raw" || meta.kind === "cable")
    ) {
      return { meta, userNotes };
    }
  } catch {
    /* ignore */
  }
  return { meta: null, userNotes: raw };
}

/** Closing balances from a stock notes meta (v2 closing, else v1 processes). */
export function quadSignalClosingFromMeta(
  meta: QuadSignalStockMeta | null | undefined,
): Record<string, number> {
  if (!meta || meta.kind !== "cable") return {};
  if (meta.closing && Object.keys(meta.closing).length > 0) return meta.closing;
  if (meta.processes && Object.keys(meta.processes).length > 0)
    return meta.processes;
  return {};
}

/** @deprecated Prefer Raw Materials / Cable split UI. Kept for catalog fallbacks. */
export const QUAD_STOCK_PARTICULARS = [
  ...QUAD_SIGNAL_STOCK_RAW_MATERIALS.filter((x) => x !== "Other"),
  ...QUAD_SIGNAL_STOCK_CABLES.filter((x) => x !== "Other"),
  "Other",
] as const;

/** Quad + Signal — sales products (union). */
export const QUAD_SIGNAL_SALE_PRODUCTS = [
  "Signalling Cable 1.5 sq mm",
  "Signalling Cable 2.5 sq mm",
  "Signalling Cable 4 sq mm",
  "Signalling Cable 6 sq mm",
  "RDSO Black",
  "RDSO Grey",
  "Railway Quad Cable 0.9 mm",
  "Railway Quad Cable (other sizes)",
  "Star Quad Jelly-filled Cable",
  "Other",
] as const;

/** Quad & Signal — customers (union). */
export const QUAD_SIGNAL_CUSTOMERS = [
  "Indian Railways",
  "RDSO",
  "ATCL",
  "Wirelux",
  "Samriddhi Automation Noida",
  "Noto Fire",
  "Samriddhii Automation Haridwar",
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
] as const;

/** Extra Signal-side RM names (beyond Quad vendor map keys). */
const SIGNAL_EXTRA_RAW_MATERIALS = [
  "Copper Conductor",
  "PVC Insulation Compound",
  "PVC Outer Sheath Compound",
  "Filler / Binder",
  "Masterbatch (Black / Grey)",
] as const;

export function getQuadVendorsForMaterial(material: string): readonly string[] {
  const key = material.trim();
  if (!key || key === "Other") {
    const all = new Set<string>();
    for (const vendors of Object.values(QUAD_RAW_MATERIAL_VENDORS)) {
      for (const vendor of vendors) all.add(vendor);
    }
    return [...all, "Other"];
  }
  const mapped = QUAD_RAW_MATERIAL_VENDORS[key];
  if (!mapped) return ["Other"];
  return [...mapped, "Other"];
}

export function getQuadSignalPurchaseGoods(): readonly string[] {
  const set = new Set<string>([
    ...QUAD_RAW_MATERIALS.filter((x) => x !== "Other"),
    ...SIGNAL_EXTRA_RAW_MATERIALS,
    "Other",
  ]);
  return [...set];
}

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
        "DORI",
        "STRIP",
        "RASSA",
        "PIPE",
        "Copper Cathode",
        "Copper Scrap / Burr",
        "CC Copper Rod 8 mm",
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

export function getPurchaseCatalog(plantCode: string): {
  suppliers: readonly string[];
  goods: readonly string[];
} {
  if (plantCode.toUpperCase() === "PVC") {
    return {
      suppliers: PVC_SUPPLIERS,
      goods: PVC_PURCHASE_GOODS,
    };
  }

  if (plantCode.toUpperCase() === "UPCAST") {
    return {
      suppliers: DEFAULT_SUPPLIERS,
      goods: [
        "Copper Cathode",
        "Coper Scrap-Dori",
        "Copper Scrap-Strip",
        "Copper Scrap-Rassa",
        "copper Scrap Pipe",
        "copper Scrap -Teli",
        "copper Scrap -Plan Copper",
        "copper Scrap -Burn/Jla copper",
        "copper Scrap -RBD Scrap",
        "Charcoal / Covering Agent",
        "Graphite Die / Consumables",
        "Other",
      ],
    };
  }

  if (isQuadSignalPlant(plantCode)) {
    return {
      suppliers: getQuadVendorsForMaterial(""),
      goods: getQuadSignalPurchaseGoods(),
    };
  }

  if (plantCode.toUpperCase() === "CONDUCTOR") {
    return {
      suppliers: CONDUCTOR_SUPPLIERS,
      goods: CONDUCTOR_PURCHASE_GOODS,
    };
  }

  const segment = getPlantSegment(plantCode);
  if (segment && !isCat6Plant(plantCode)) {
    return {
      suppliers: DEFAULT_SUPPLIERS,
      goods: [...segment.rawMaterials.map((i) => i.name), "Other"],
    };
  }

  return {
    suppliers: DEFAULT_SUPPLIERS,
    goods: DEFAULT_PURCHASE_GOODS,
  };
}

export function getSalesCatalog(plantCode: string): readonly string[] {
  if (isCat6Plant(plantCode)) return CAT6_SALE_PRODUCTS;
  if (plantCode?.toUpperCase() === "CONDUCTOR") {
    return CONDUCTOR_SALE_SIZES;
  }
  if (isQuadSignalPlant(plantCode)) {
    return QUAD_SIGNAL_SALE_PRODUCTS;
  }
  const segment = getPlantSegment(plantCode);
  if (segment) {
    return [...segment.finalProducts.map((i) => i.name), "Other"];
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
  if (plantCode?.toUpperCase() === "CONDUCTOR") {
    return CONDUCTOR_CUSTOMERS;
  }
  if (isQuadSignalPlant(plantCode)) {
    return QUAD_SIGNAL_CUSTOMERS;
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
  "FAR",
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
export const CAT6_DIRECT_EXPENSE_HEADS = [
  "Electricity",
  "Petty Cash",
  "Other",
] as const;

export const CAT6_INDIRECT_EXPENSE_HEADS = [
  "Salary & Wages",
  "Miscellaneous",
  "FAR",
  "Factory Rent",
] as const;

export const CAT6_EXPENSE_HEADS = [
  ...CAT6_DIRECT_EXPENSE_HEADS,
  ...CAT6_INDIRECT_EXPENSE_HEADS,
] as const;

/** LED Rope — Direct/Indirect; Electricity + Rent aligned with PVC-style plants. */
export const LED_DIRECT_EXPENSE_HEADS = [
  "Electricity",
  "Other",
] as const;

export const LED_INDIRECT_EXPENSE_HEADS = [
  "Salary & Wages",
  "Miscellaneous",
  "FAR",
  "Factory Rent",
] as const;

export const LED_EXPENSE_HEADS = [
  ...LED_DIRECT_EXPENSE_HEADS,
  ...LED_INDIRECT_EXPENSE_HEADS,
] as const;

/**
 * Upcast expense UI: Electricity / Rent like PVC, plus Misc natures from Excel.
 * P&L still breaks Misc natures into Excel lines (Consultancy, Consumable, …).
 */
export const UPCAST_DIRECT_EXPENSE_HEADS = [
  "Electricity",
  "Unloading of MT",
  "Contractor Wages",
  "Miscellaneous",
] as const;

export const UPCAST_INDIRECT_EXPENSE_HEADS = [
  "Salary Expenses",
  "FAR",
  "Financial Cost",
  "Factory Rent",
] as const;

export const UPCAST_EXPENSE_HEADS = [
  ...UPCAST_DIRECT_EXPENSE_HEADS,
  ...UPCAST_INDIRECT_EXPENSE_HEADS,
] as const;

/** Excel Misc Exp. factory natures → P&L DIRECT lines (entered via Miscellaneous). */
export const UPCAST_MISC_NATURES = [
  "Consultancy Exp.",
  "Consumable Item",
  "Freight & Others",
  "Maintenance Item",
  "Travelling Charges",
  "Welfare Charges",
  "Other Charges",
] as const;

/** @deprecated use UPCAST_MISC_NATURES */
export const UPCAST_MISC_DIRECT_HEADS = UPCAST_MISC_NATURES;

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
  if (code === "UPCAST") {
    return section === "direct"
      ? UPCAST_DIRECT_EXPENSE_HEADS
      : UPCAST_INDIRECT_EXPENSE_HEADS;
  }
  if (code === "LEDROPE" || code === "SLSSL" || isQuadSignalPlant(code)) {
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
  const normalized = head.trim();
  if (
    normalizePvcExpenseHead(normalized) === "FAR" ||
    normalized === "Financial Cost"
  ) {
    return "indirect";
  }
  if (code === "PVC") return pvcExpenseSection(head);
  if (code === "CAT6") {
    if (
      (CAT6_DIRECT_EXPENSE_HEADS as readonly string[]).includes(normalized)
    ) {
      return "direct";
    }
    return "indirect";
  }
  if (code === "UPCAST") {
    const upcastHead = normalizeUpcastExpenseHead(normalized);
    if (
      (UPCAST_DIRECT_EXPENSE_HEADS as readonly string[]).includes(upcastHead) ||
      (UPCAST_MISC_NATURES as readonly string[]).includes(upcastHead)
    ) {
      return "direct";
    }
    return "indirect";
  }
  if (code === "LEDROPE" || code === "SLSSL" || isQuadSignalPlant(code)) {
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
  if (code === "UPCAST") return UPCAST_EXPENSE_HEADS;
  if (code === "LEDROPE" || code === "SLSSL" || isQuadSignalPlant(code)) {
    return LED_EXPENSE_HEADS;
  }
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
  switch (normalizePvcExpenseHead(head)) {
    case "Petty Cash":
      return "PETTY CASH EXP";
    case "FAR":
      return "DEPRECIATION";
    case "Financial Cost":
      return "FINANCIAL COST";
    case "Electricity":
    case "Fuel & Power":
      return "FUEL & POWER EXP";
    case "Factory Rent":
      return "FACTORY RENT";
    case "Other":
    case "Salary & Wages":
    case "Miscellaneous":
    case "Transport":
    case "Maintenance":
    case "Office":
      return "WAGES & SALARY EXP";
    default:
      return "WAGES & SALARY EXP";
  }
}

/** Short tab label for dense expense category bars (full name stays in aria-label). */
export function expenseHeadTabLabel(head: string): string {
  return head;
}

/** Split long expense category labels onto two lines for dense tab bars. */
export function expenseHeadLabelLines(head: string): [string, string] | null {
  if (head.trim() === "Miscellaneous") return null;
  const parts = head.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.length === 2) return [parts[0], parts[1]];
  if (parts.length === 3 && parts[1] === "&") {
    return [`${parts[0]} &`, parts[2]];
  }
  if (parts.length === 3) {
    return [parts[0], `${parts[1]} ${parts[2]}`];
  }
  const mid = Math.ceil(parts.length / 2);
  return [parts.slice(0, mid).join(" "), parts.slice(mid).join(" ")];
}

/** Normalize legacy expense labels to current catalog names. */
export function normalizePvcExpenseHead(head: string): string {
  const h = head.trim();
  if (h === "Electricity" || h === "Fuel & Power") return "Fuel & Power";
  if (h === "Depreciation (FAR)" || h === "Depreciation") return "FAR";
  if (h === "Unloading MT") return "Unloading of MT";
  if (h === "Rent") return "Factory Rent";
  return h;
}

/** Normalize Upcast Misc / Excel natures to catalog expense heads. */
export function normalizeUpcastExpenseHead(head: string): string {
  const h = head.replace(/\s+/g, " ").trim();
  const key = h.toUpperCase();
  const map: Record<string, string> = {
    ELECTRICITY: "Electricity",
    "FUEL & POWER": "Electricity",
    "FUEL & POWER EXP.": "Electricity",
    "FUEL & POWER EXP": "Electricity",
    "UNLOADING OF MT": "Unloading of MT",
    "UNLOADING MT": "Unloading of MT",
    "UNLOADING EXP.": "Unloading of MT",
    "UNLOADING EXP": "Unloading of MT",
    "CONTRACTOR WAGES": "Contractor Wages",
    "LABOUR CONTRACTOR": "Contractor Wages",
    "CONSULTANCY EXP.": "Consultancy Exp.",
    "CONSULTANCY EXP": "Consultancy Exp.",
    "CONSUMABLE ITEM": "Consumable Item",
    "FREIGHT & OTHERS": "Freight & Others",
    "MAINTENANCE ITEM": "Maintenance Item",
    "TRAVELLING CHARGES": "Travelling Charges",
    "WELFARE CHARGES": "Welfare Charges",
    "OTHER CHARGES": "Other Charges",
    "SALARY EXPNES": "Salary Expenses",
    "SALARY EXPENSE": "Salary Expenses",
    "SALARY EXPENSES": "Salary Expenses",
    "FACTORY RENT": "Factory Rent",
    FAR: "FAR",
    "DEPRECIATION (FAR)": "FAR",
    DEPRECIATION: "FAR",
    "FINANCIAL COST": "Financial Cost",
  };
  return map[key] ?? h;
}

/** Upcast expense category → P&L line label (Excel wording). */
export function upcastExpensePnlLine(head: string): string {
  switch (normalizeUpcastExpenseHead(head)) {
    case "Fuel & Power":
    case "Electricity":
      return "FUEL & POWER EXP.";
    case "Unloading of MT":
      return "UNLOADING EXP.";
    case "Contractor Wages":
      return "CONTRACTOR WAGES";
    case "Consultancy Exp.":
      return "CONSULTANCY EXP.";
    case "Consumable Item":
      return "CONSUMABLE ITEM";
    case "Freight & Others":
      return "FREIGHT & OTHERS";
    case "Maintenance Item":
      return "MAINTENANCE ITEM";
    case "Travelling Charges":
      return "TRAVELLING CHARGES";
    case "Welfare Charges":
      return "WELFARE CHARGES";
    case "Other Charges":
      return "OTHER CHARGES";
    case "Miscellaneous":
      return "MISCELLANEOUS EXP.";
    case "Salary Expenses":
      return "SALARY EXPENSES";
    case "FAR":
      return "DEPRECIATION";
    case "Financial Cost":
      return "FINANCIAL COST";
    case "Factory Rent":
    case "Rent":
      return "FACTORY RENT";
    default:
      return head.trim().toUpperCase();
  }
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
