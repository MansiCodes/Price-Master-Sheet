import {
  DEFAULT_PURCHASE_GOODS,
  getQuadSignalCableSizes,
  QUAD_SIGNAL_STOCK_CABLES,
  QUAD_SIGNAL_STOCK_RAW_MATERIALS,
} from "@/lib/plant-catalogs";
import type { TodayHubCatalogs } from "@/components/today/hub/useTodayHubCatalogs";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";

export function resetTodayHubStockWip(stock: TodayHubStockState) {
  stock.setStockCable(QUAD_SIGNAL_STOCK_CABLES[0]);
  stock.setStockCableOther("");
  stock.setStockCableSize(
    getQuadSignalCableSizes(QUAD_SIGNAL_STOCK_CABLES[0])[0] ?? "Other",
  );
  stock.setStockCableSizeOther("");
  stock.setStockProcessQtys({});
  stock.setStockWipOpening({});
  stock.setStockOpeningEditable(false);
  stock.setStockWipContextLoading(false);
  stock.setStockCallPutup("");
  stock.setStockPutupDate("");
  stock.setStockPartyName("");
  stock.setStockDispatchPending("");
  stock.setStockDispatchParty("");
  stock.setStockCallPutupItems([{ qty: "", date: "", partyName: "" }]);
  stock.setStockDispatchPendingItems([{ qty: "", partyName: "" }]);
}

export function resetTodayHubStockItem(
  stock: TodayHubStockState,
  catalogs: TodayHubCatalogs,
  isQuad: boolean,
) {
  const { stockCatalog } = catalogs;
  stock.setStockItem(
    isQuad
      ? QUAD_SIGNAL_STOCK_RAW_MATERIALS[0]
      : stockCatalog.particulars[0] ?? DEFAULT_PURCHASE_GOODS[0],
  );
  stock.setStockItemOther("");
  stock.setStockSize(stockCatalog.sizes?.[0] ?? "8mm");
  stock.setStockSizeOther("");
  stock.setStockQty("");
  stock.setStockUnit(stockCatalog.defaultUnit);
  stock.setStockRate("");
  stock.setStockValue("");
  stock.setStockNotes("");
  stock.setStockType("closing");
  stock.setStockPhotos([]);
}

export function resetTodayHubStock(
  stock: TodayHubStockState,
  catalogs: TodayHubCatalogs,
  isQuad: boolean,
) {
  stock.setStockCategory("RM");
  stock.setStockKind("raw");
  resetTodayHubStockWip(stock);
  resetTodayHubStockItem(stock, catalogs, isQuad);
}
