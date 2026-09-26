import type { EntryKind } from "@/components/today/today-hub-model";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import type { TodayHubCatalogs } from "@/components/today/hub/useTodayHubCatalogs";
import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import { useQuadInsulationFilter } from "@/components/today/hub/useQuadInsulationFilter";
import { useQuadWipResetOnSize } from "@/components/today/hub/useQuadWipResetOnSize";
import { useQuadStockCatalogSync } from "@/components/today/hub/useQuadStockCatalogSync";
import { useQuadPurchaseRate } from "@/components/today/hub/useQuadPurchaseRate";
import { useQuadStockValueSync } from "@/components/today/hub/useQuadStockValueSync";
import { resolveConductorStockSize } from "@/components/today/hub/resolve-stock-size";

export function useQuadWipEffects(
  flags: TodayHubFlags,
  catalogs: TodayHubCatalogs,
  stock: TodayHubStockState,
  kind: EntryKind,
  plantId: string,
  entryDate: string,
  isSignallingStock: boolean,
) {
  const { isQuad, isConductor } = flags;
  useQuadInsulationFilter(isSignallingStock, stock.resolvedQuadSizeName, stock.setStockInsulationExtras);
  useQuadWipResetOnSize(isQuad, stock.stockKind, stock.resolvedQuadCableName, stock.resolvedQuadSizeName, stock);
  useQuadStockCatalogSync(isQuad, catalogs.stockCatalog, stock.setStockItem, stock.setStockUnit);
  useQuadPurchaseRate(kind, plantId, entryDate, stock);
  useQuadStockValueSync(stock);
  return {
    resolvedStockSize: resolveConductorStockSize(isConductor, stock.stockSize, stock.stockSizeOther),
  };
}
