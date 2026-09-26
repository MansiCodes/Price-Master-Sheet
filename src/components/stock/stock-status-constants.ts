import {
  getQuadSignalCableSizes,
  QUAD_SIGNAL_STOCK_CABLES,
} from "@/lib/plant-catalogs";
import type { CableStockStatusBlock } from "@/lib/stock-production-status";

export const DEFAULT_PAGE_SIZE = 10;
export const ALL_CABLES = "All cables";
export const ALL_SIZES = "All sizes";
export const CABLE_TYPES = QUAD_SIGNAL_STOCK_CABLES.filter((c) => c !== "Other");

export type DisplayCard = {
  key: string;
  cable: string;
  size: string;
  block: CableStockStatusBlock | null;
};

export function isCatalogCable(cable: string): boolean {
  return (CABLE_TYPES as readonly string[]).includes(cable);
}

export function catalogSizesForCable(cable: string): string[] {
  return getQuadSignalCableSizes(
    isCatalogCable(cable) ? cable : "Other",
  ).filter((s) => s !== "Other");
}
