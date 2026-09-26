import { QUAD_SIGNAL_STOCK_CABLES } from "./quad-signal-cables";

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

/** Quad + Signal — stock Raw Materials (from ATCL RM sheet). */
export const QUAD_SIGNAL_STOCK_RAW_MATERIALS = [
  "TYPE A + TC01",
  "CW20",
  "HDPE OPAL",
  "HDPE BLS",
  "LDPE",
  "PVC COMPOUND BLACK",
  "PVC COMPOUND GREY",
  "POLYSTER TAPE",
  "POLYAL TAPE",
  "MASTER BATCH",
  "CRYSTAL",
  "ZHFR KLJ",
  "S190 PERIWAL PVC",
  "JELLY",
  "BLACK PVC TAPE 40 MM",
  "XLPE",
  "NAILS (GUN)",
  "GI WIRE .90MM",
  "GI WIRE 1.40MM",
  "GI SRTIP",
  "DST 25X.50",
  "DST 25X.35",
  "DST 32X.0.50",
  "DST 32X.35",
  "DST ZINK  25X.50",
  "DST ZINK  32X.80",
  "DST ZINK  32X.50",
  "BC Tape",
  "GLUE",
  "PP Binder 3MM All Colour",
  "42X30X16 (12C,30C,2C25)",
  "40X22X16 (19C,6C,10P0.63)",
  "28X22X16 (MC, Pijf 500Mtr)",
  "36X22X14 (2c2.5)",
  "32x22x14 (MC 60C0.6)",
  "28X18X12",
  "44X30X16 (100P0.5-500Mtr)",
  "54x32x22",
  "Other",
] as const;

/** Extra Signal-side RM names (beyond Quad vendor map keys). */
export const SIGNAL_EXTRA_RAW_MATERIALS = [
  "Copper Conductor",
  "PVC Insulation Compound",
  "PVC Outer Sheath Compound",
  "Filler / Binder",
  "Masterbatch (Black / Grey)",
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

/** @deprecated Prefer Raw Materials / Cable split UI. Kept for catalog fallbacks. */
export const QUAD_STOCK_PARTICULARS = [
  ...QUAD_SIGNAL_STOCK_RAW_MATERIALS.filter((x) => x !== "Other"),
  ...QUAD_SIGNAL_STOCK_CABLES.filter((x) => x !== "Other"),
  "Other",
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
