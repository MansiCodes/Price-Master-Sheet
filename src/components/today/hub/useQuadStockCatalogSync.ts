import { useEffect } from "react";
import {
  DEFAULT_PURCHASE_GOODS,
  QUAD_SIGNAL_STOCK_RAW_MATERIALS,
} from "@/lib/plant-catalogs";
import type { TodayHubCatalogs } from "@/components/today/hub/useTodayHubCatalogs";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";

export function useQuadStockCatalogSync(
  isQuad: boolean,
  stockCatalog: TodayHubCatalogs["stockCatalog"],
  setStockItem: TodayHubStockState["setStockItem"],
  setStockUnit: TodayHubStockState["setStockUnit"],
) {
  useEffect(() => {
    setStockItem(
      isQuad
        ? QUAD_SIGNAL_STOCK_RAW_MATERIALS[0]
        : stockCatalog.particulars[0] ?? DEFAULT_PURCHASE_GOODS[0],
    );
    setStockUnit(stockCatalog.defaultUnit);
  }, [stockCatalog, isQuad, setStockItem, setStockUnit]);
}
