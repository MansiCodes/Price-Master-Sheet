export const PVC_SUPPLIERS = [
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

export const PVC_PURCHASE_GOODS = [
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
