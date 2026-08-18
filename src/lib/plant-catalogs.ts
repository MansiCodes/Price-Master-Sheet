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
] as const;

export const STOCK_CATEGORIES = ["RM", "WIP", "FG"] as const;

export function getStockCatalog(plantCode: string): {
  particulars: readonly string[];
  defaultUnit: string;
} {
  if (plantCode.toUpperCase() === "PVC") {
    return {
      particulars: PVC_STOCK_PARTICULARS,
      defaultUnit: "KGS",
    };
  }

  return {
    particulars: DEFAULT_PURCHASE_GOODS,
    defaultUnit: "kg",
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

  return {
    suppliers: DEFAULT_SUPPLIERS,
    goods: DEFAULT_PURCHASE_GOODS,
  };
}

export function getSalesCatalog(plantCode: string): readonly string[] {
  if (isCat6Plant(plantCode)) return CAT6_SALE_PRODUCTS;
  return [
    "CAT6 Patch Cable Solid with Connectors",
    "Aluminium Wire",
    "CAT6 PATCH CABLE",
    "Copper Wire Rod",
    "Corrugated Box",
    "HDPE Compound",
    "MDPE Compound",
    "Plastic Granuals",
    "Polyster Yarn",
    "PVC Compound",
    "SPOOL",
  ];
}

export function getStockCatalog(plantCode: string): readonly string[] {
  if (isCat6Plant(plantCode)) {
    return [...CAT6_STOCK_ITEMS, ...CAT6_PURCHASE_GOODS, "Others"];
  }
  if (plantCode.toUpperCase() === "PVC") {
    return [...PVC_PURCHASE_GOODS, "Others"];
  }
  return [...DEFAULT_PURCHASE_GOODS, "Others"];
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
  ];
}
