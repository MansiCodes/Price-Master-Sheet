/**
 * Step-1 business-segment map: plants ↔ raw materials ↔ final product types.
 * DB `code` stays stable for existing data; `name` is the display label.
 *
 * Draft lists for new plants (Upcast / SL SSL / Quad / Rope light) are
 * industry-typical starters — refine before locking BOMs (Step 2).
 */

export type PlantSegmentKind = "RM" | "FG";

export type PlantSegmentItem = {
  name: string;
  kind: PlantSegmentKind;
  /** Optional unit hint for stock / BOM later */
  unit?: string;
  note?: string;
};

export type PlantSegment = {
  code: string;
  name: string;
  /** Short label shown under the plant name when opening / choosing */
  rmSummary: string;
  sortOrder: number;
  rawMaterials: PlantSegmentItem[];
  finalProducts: PlantSegmentItem[];
};

export const PLANT_SEGMENTS: PlantSegment[] = [
  {
    code: "UPCAST",
    name: "Upcast Plant",
    rmSummary: "Copper cathode · Copper scrap",
    sortOrder: 1,
    rawMaterials: [
      { name: "Copper Cathode", kind: "RM", unit: "KGS" },
      { name: "Copper Scrap / Burr", kind: "RM", unit: "KGS" },
      { name: "Charcoal / Covering Agent", kind: "RM", unit: "KGS" },
      { name: "Graphite Die / Consumables", kind: "RM", unit: "NOS" },
    ],
    finalProducts: [
      { name: "CC Copper Rod 8 mm", kind: "FG", unit: "KGS" },
      { name: "CC Copper Rod Other Dia", kind: "FG", unit: "KGS" },
    ],
  },
  {
    code: "PVC",
    name: "PVC RP Plant",
    rmSummary: "CPW · Calcium · Thermal · Scrap PVC",
    sortOrder: 2,
    rawMaterials: [
      { name: "CPW", kind: "RM", unit: "KGS" },
      { name: "Thermal / Stabilizer (CZ-35)", kind: "RM", unit: "KGS" },
      { name: "Calcium Powder", kind: "RM", unit: "KGS" },
      { name: "Titanium Di Oxide", kind: "RM", unit: "KGS" },
      { name: "WAX / MOM / Stearic Acid", kind: "RM", unit: "KGS" },
      { name: "Carbon / Black Carbon", kind: "RM", unit: "KGS" },
      { name: "Pigment Colour-RED", kind: "RM", unit: "KGS" },
      { name: "Pigment Colour-BLUE", kind: "RM", unit: "KGS" },
      { name: "Chlorinated Paraffin", kind: "RM", unit: "KGS" },
      { name: "Pani Pipe (scrap input)", kind: "RM", unit: "KGS" },
      { name: "Green Pipe (scrap input)", kind: "RM", unit: "KGS" },
      { name: "S. Clear / Soft Clear PVC scrap", kind: "RM", unit: "KGS" },
      { name: "H. Cilies (Waste PVC Scrap)", kind: "RM", unit: "KGS" },
      { name: "JHAL Plastic Scrap", kind: "RM", unit: "KGS" },
      { name: "Lump+Cable", kind: "RM", unit: "KGS" },
      { name: "Old Plastic Waste Scrap (PVC Pipe)", kind: "RM", unit: "KGS" },
    ],
    finalProducts: [
      { name: "Soft PVC Compound (RP)", kind: "FG", unit: "KGS" },
      { name: "Soft Clear PVC", kind: "FG", unit: "KGS" },
      { name: "Reprocessed PVC Granules", kind: "FG", unit: "KGS" },
      { name: "Colour PVC Compound", kind: "FG", unit: "KGS" },
    ],
  },
  {
    code: "LEDROPE",
    name: "Rope Light Plant",
    rmSummary: "LED chip · Copper · PVC / PE compound",
    sortOrder: 3,
    rawMaterials: [
      { name: "LED Chip / SMD", kind: "RM", unit: "NOS" },
      { name: "Copper Wire / Bus Wire", kind: "RM", unit: "KGS" },
      { name: "PVC / PE Compound (sheath)", kind: "RM", unit: "KGS" },
      { name: "Resistor / Driver components", kind: "RM", unit: "NOS" },
      { name: "Masterbatch / Colour", kind: "RM", unit: "KGS" },
      { name: "Power Cord / Connector", kind: "RM", unit: "NOS" },
      { name: "Packing / Spool", kind: "RM", unit: "NOS" },
    ],
    finalProducts: [
      { name: "LED Rope Light (Indoor)", kind: "FG", unit: "MTR" },
      { name: "LED Rope Light (Outdoor)", kind: "FG", unit: "MTR" },
      { name: "LED Rope Light Coil / Roll", kind: "FG", unit: "ROLL" },
    ],
  },
  {
    code: "SLSSL",
    name: "SL SSL Plant",
    rmSummary: "Copper · PVC / XLPE · Screening tape",
    sortOrder: 4,
    rawMaterials: [
      { name: "Copper Wire / Conductor", kind: "RM", unit: "KGS" },
      { name: "PVC Compound (insulation)", kind: "RM", unit: "KGS" },
      { name: "XLPE / PE Compound", kind: "RM", unit: "KGS" },
      { name: "Screening Tape / Aluminium Foil", kind: "RM", unit: "KGS" },
      { name: "PVC Outer Sheath Compound", kind: "RM", unit: "KGS" },
      { name: "Filler / Binder Tape", kind: "RM", unit: "KGS" },
    ],
    finalProducts: [
      { name: "SL Cable (unshielded)", kind: "FG", unit: "MTR" },
      { name: "SSL Cable (screened / shielded)", kind: "FG", unit: "MTR" },
      { name: "SL/SSL Multi-core Control Cable", kind: "FG", unit: "MTR" },
    ],
  },
  {
    code: "CAT6",
    name: "CAT-6 Cable Plant",
    rmSummary: "Copper · HDPE/LDPE · PVC · Tape",
    sortOrder: 5,
    rawMaterials: [
      { name: "Copper / Copper Wire", kind: "RM", unit: "KGS" },
      { name: "Copper Wire Rod 8mm", kind: "RM", unit: "KGS" },
      { name: "HDPE Compound", kind: "RM", unit: "KGS" },
      { name: "LDPE Compound", kind: "RM", unit: "KGS" },
      { name: "MDPE Compound", kind: "RM", unit: "KGS" },
      { name: "PVC Compound", kind: "RM", unit: "KGS" },
      { name: "IN-PVC / OT-PVC", kind: "RM", unit: "KGS" },
      { name: "Master Batch / Masterbatch Grey", kind: "RM", unit: "KGS" },
      { name: "ALU / Aluminium Wire", kind: "RM", unit: "KGS" },
      { name: "Polyester Film / Tape", kind: "RM", unit: "KGS" },
      { name: "Polyester Yarn / Dhaga", kind: "RM", unit: "KGS" },
      { name: "Phlogopite Mica", kind: "RM", unit: "KGS" },
      { name: "XL-ZHFR", kind: "RM", unit: "KGS" },
      { name: "Spool / Boxes / Packing", kind: "RM", unit: "NOS" },
    ],
    finalProducts: [
      { name: "CAT6 UTP 23 AWG (305 Mtr Box)", kind: "FG", unit: "BOX" },
      { name: "CAT6 UTP 24 AWG (305 Mtr Box)", kind: "FG", unit: "BOX" },
      { name: "CAT6 SFTP / STP / Armoured", kind: "FG", unit: "BOX" },
      { name: "CAT6 Double Sheathed Outdoor", kind: "FG", unit: "BOX" },
      { name: "CAT6 Patch Cable with RJ45", kind: "FG", unit: "NOS" },
      { name: "CAT5E UTP Cable", kind: "FG", unit: "BOX" },
    ],
  },
  {
    code: "SIGNALLING",
    name: "Signal Plant",
    rmSummary: "Copper · PVC · RDSO sheath compounds",
    sortOrder: 6,
    rawMaterials: [
      { name: "Copper Conductor", kind: "RM", unit: "KGS" },
      { name: "PVC Insulation Compound", kind: "RM", unit: "KGS" },
      { name: "PVC Outer Sheath Compound", kind: "RM", unit: "KGS" },
      { name: "Filler / Binder", kind: "RM", unit: "KGS" },
      { name: "Masterbatch (Black / Grey)", kind: "RM", unit: "KGS" },
    ],
    finalProducts: [
      { name: "Signalling Cable 1.5 sq mm", kind: "FG", unit: "MTR" },
      { name: "Signalling Cable 2.5 sq mm", kind: "FG", unit: "MTR" },
      { name: "Signalling Cable 4 sq mm", kind: "FG", unit: "MTR" },
      { name: "Signalling Cable 6 sq mm", kind: "FG", unit: "MTR" },
      { name: "RDSO Black", kind: "FG", unit: "MTR" },
      { name: "RDSO Grey", kind: "FG", unit: "MTR" },
    ],
  },
  {
    code: "QUAD",
    name: "Quad Plant",
    rmSummary: "Copper · PE / PVC · Star-quad fillers",
    sortOrder: 7,
    rawMaterials: [
      { name: "Copper Wire (fine gauge)", kind: "RM", unit: "KGS" },
      { name: "PE / Foam PE Insulation", kind: "RM", unit: "KGS" },
      { name: "PVC Outer Sheath", kind: "RM", unit: "KGS" },
      { name: "Star-quad Filler / Binder", kind: "RM", unit: "KGS" },
      { name: "Screening / Armour (if applicable)", kind: "RM", unit: "KGS" },
    ],
    finalProducts: [
      { name: "Railway Quad Cable 0.9 mm", kind: "FG", unit: "MTR" },
      { name: "Railway Quad Cable (other sizes)", kind: "FG", unit: "MTR" },
      { name: "Star Quad Jelly-filled Cable", kind: "FG", unit: "MTR" },
    ],
  },
  {
    code: "CONDUCTOR",
    name: "Conductor Plant",
    rmSummary: "Copper · Aluminium · Wire rod",
    sortOrder: 8,
    rawMaterials: [
      { name: "Copper Wire Rod", kind: "RM", unit: "KGS" },
      { name: "Copper Cathode", kind: "RM", unit: "KGS" },
      { name: "Aluminium Ingot / Wire Rod", kind: "RM", unit: "KGS" },
      { name: "Drawing Lubricant", kind: "RM", unit: "KGS" },
      { name: "Stranding Filler / Binder", kind: "RM", unit: "KGS" },
    ],
    finalProducts: [
      { name: "Copper Conductor (bare)", kind: "FG", unit: "KGS" },
      { name: "Stranded Copper Conductor", kind: "FG", unit: "KGS" },
      { name: "Aluminium Conductor (AAC)", kind: "FG", unit: "KGS" },
      { name: "ACSR Conductor", kind: "FG", unit: "KGS" },
    ],
  },
];

const byCode = new Map(
  PLANT_SEGMENTS.map((s) => [s.code.toUpperCase(), s] as const),
);

export function getPlantSegment(code: string | null | undefined): PlantSegment | null {
  if (!code) return null;
  return byCode.get(code.trim().toUpperCase()) ?? null;
}

export function getPlantRmSummary(code: string | null | undefined): string {
  return getPlantSegment(code)?.rmSummary ?? "";
}

export function listPlantSeeds(): Array<{ code: string; name: string }> {
  return [...PLANT_SEGMENTS]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ code, name }) => ({ code, name }));
}

/** Flat rows for Excel / canvas Step-1 export. */
export function flattenPlantSegmentRows(): Array<{
  sortOrder: number;
  plantCode: string;
  plantName: string;
  kind: PlantSegmentKind;
  itemName: string;
  unit: string;
  note: string;
}> {
  const rows = [];
  for (const seg of [...PLANT_SEGMENTS].sort((a, b) => a.sortOrder - b.sortOrder)) {
    for (const item of seg.rawMaterials) {
      rows.push({
        sortOrder: seg.sortOrder,
        plantCode: seg.code,
        plantName: seg.name,
        kind: "RM" as const,
        itemName: item.name,
        unit: item.unit ?? "",
        note: item.note ?? "",
      });
    }
    for (const item of seg.finalProducts) {
      rows.push({
        sortOrder: seg.sortOrder,
        plantCode: seg.code,
        plantName: seg.name,
        kind: "FG" as const,
        itemName: item.name,
        unit: item.unit ?? "",
        note: item.note ?? "",
      });
    }
  }
  return rows;
}
