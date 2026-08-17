export const DEFAULT_PURCHASE_GOODS = [
  "INSU & OUT",
  "TAPE",
  "INSU",
  "DHAGA",
  "BOXES",
  "IN-PVC",
  "ALU",
  "Spool",
  "COPPER",
  "MASTER BATCH",
  "OT-PVC",
] as const;

export const DEFAULT_SUPPLIERS = [
  "3R Polymers Private Limited",
  "Bells Insulations Private Ltd.",
  "Cablemac Automations India Pvt. Ltd",
  "Crown Trading C",
  "Goel Packers",
  "Hycount Cables Private Limited",
  "Paramhans Wires Private Limited",
  "Perfect Metals",
  "Pryas Wire Industries",
  "Sag Polymers Private Limited",
  "SINGHAL PRINT PACK",
  "Tirupati Plastics",
] as const;

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
  "H. CLEAR/GRANDING/S. CLEAR/JHAAL",
  "S. CLEAR / GREEN PIPE",
] as const;

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

  return {
    suppliers: DEFAULT_SUPPLIERS,
    goods: DEFAULT_PURCHASE_GOODS,
  };
}
