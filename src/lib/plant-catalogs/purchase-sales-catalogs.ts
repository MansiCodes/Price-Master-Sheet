import { CAT6_CUSTOMERS, CAT6_SALE_PRODUCTS } from "@/lib/cat6-catalogs";
import { isCat6Plant, isQuadSignalPlant } from "@/lib/plant-layout";
import { getPlantSegment } from "@/lib/plant-segments";
import { DEFAULT_PURCHASE_GOODS, DEFAULT_SUPPLIERS } from "./cat6";
import {
  CONDUCTOR_CUSTOMERS,
  CONDUCTOR_PURCHASE_GOODS,
  CONDUCTOR_SALE_SIZES,
  CONDUCTOR_SUPPLIERS,
} from "./conductor";
import { PVC_PURCHASE_GOODS, PVC_SUPPLIERS } from "./pvc";
import {
  QUAD_SIGNAL_CUSTOMERS,
  QUAD_SIGNAL_SALE_PRODUCTS,
  getQuadSignalPurchaseGoods,
  getQuadVendorsForMaterial,
} from "./quad-signal-materials";

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
