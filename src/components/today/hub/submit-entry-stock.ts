import { submitStockQuadRaw } from "@/components/today/hub/submit-stock-quad-raw";
import { submitStockQuadCable } from "@/components/today/hub/submit-stock-quad-cable";
import { submitStockOther } from "@/components/today/hub/submit-stock-other";
import type { FailFn, SubmitOutcome } from "@/components/today/hub/submit-types";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

function stockClosingRate(stock: TodayHubVm["stock"]) {
  const issuedQty = Number(stock.stockQty);
  const manualRateRaw = stock.stockRate.trim();
  const manualRate = manualRateRaw === "" ? NaN : Number(manualRateRaw);
  const closingRate =
    Number.isFinite(manualRate) && manualRate >= 0
      ? manualRate
      : stock.stockPurchaseRate != null && Number.isFinite(stock.stockPurchaseRate)
        ? stock.stockPurchaseRate
        : 0;
  const closingValue = Number.isFinite(issuedQty) ? issuedQty * closingRate : 0;
  return { issuedQty, closingRate, closingValue };
}

function submitStockQuadRawFromVm(
  vm: TodayHubVm,
  fail: FailFn,
  issuedQty: number,
  closingRate: number,
  closingValue: number,
) {
  const { plantId, stock, session } = vm;
  return submitStockQuadRaw({
    plantId, entryDate: session.entryDate, shift: session.shift,
    resolvedItem: stock.resolvedStockItemName, stockItem: stock.stockItem,
    stockItemOther: stock.stockItemOther, stockQty: stock.stockQty,
    issuedQty, stockUnit: stock.stockUnit, closingRate, closingValue,
    stockNotes: stock.stockNotes, stockPhotos: stock.stockPhotos, fail,
  });
}

function submitStockQuadCableFromVm(
  vm: TodayHubVm,
  fail: FailFn,
  issuedQty: number,
  closingRate: number,
) {
  const { plantId, stock, session, quad } = vm;
  return submitStockQuadCable({
    plantId, entryDate: session.entryDate, shift: session.shift,
    stockCable: stock.stockCable, stockCableOther: stock.stockCableOther,
    stockCableSize: stock.stockCableSize, stockCableSizeOther: stock.stockCableSizeOther,
    quadCableProcessFields: quad.quadCableProcessFields,
    stockProcessQtys: stock.stockProcessQtys, stockWipOpening: stock.stockWipOpening,
    stockLengthFactor: stock.stockLengthFactor, stockLengthOptions: stock.stockLengthOptions,
    stockInsulationExtras: stock.stockInsulationExtras,
    stockSingleQuadExtras: stock.stockSingleQuadExtras,
    stockWipSalesKm: stock.stockWipSalesKm, stockUnit: stock.stockUnit,
    issuedQty, closingRate,
    stockCallPutupItems: stock.stockCallPutupItems,
    stockDispatchPendingItems: stock.stockDispatchPendingItems,
    stockCallPutup: stock.stockCallPutup, stockPutupDate: stock.stockPutupDate,
    stockPartyName: stock.stockPartyName, stockDispatchPending: stock.stockDispatchPending,
    stockDispatchParty: stock.stockDispatchParty,
    stockNotes: stock.stockNotes, stockPhotos: stock.stockPhotos, fail,
  });
}

function upcastSubmitFields(upcast: TodayHubVm["upcast"]) {
  return {
    upcastOpeningQty: upcast.upcastOpeningQty, upcastIncomingQty: upcast.upcastIncomingQty,
    upcastOutwardQty: upcast.upcastOutwardQty, upcastTotalScrapWeight: upcast.upcastTotalScrapWeight,
    upcastPettyQty: upcast.upcastPettyQty, upcastWeightPerPetty: upcast.upcastWeightPerPetty,
    upcastTotalPettyWeight: upcast.upcastTotalPettyWeight,
    upcastSortingLossWeight: upcast.upcastSortingLossWeight,
    upcastBurningLossWeight: upcast.upcastBurningLossWeight,
    upcastWeightAfterBurning: upcast.upcastWeightAfterBurning,
    upcastRod8mmWeight: upcast.upcastRod8mmWeight,
    upcastWire8mmTo1_6mmWeight: upcast.upcastWire8mmTo1_6mmWeight,
    upcastWire1_6mmWeight: upcast.upcastWire1_6mmWeight,
    upcastTotalOutputWeight: upcast.upcastTotalOutputWeight,
    upcastCastingLossWeight: upcast.upcastCastingLossWeight,
  };
}

function submitStockOtherFromVm(
  vm: TodayHubVm,
  fail: FailFn,
  issuedQty: number,
  closingRate: number,
  closingValue: number,
) {
  const { plantId, flags, stock, session, quad } = vm;
  return submitStockOther({
    plantId, entryDate: session.entryDate, shift: session.shift,
    resolvedItem: stock.resolvedStockItemName, stockItem: stock.stockItem,
    stockItemOther: stock.stockItemOther, stockQty: stock.stockQty,
    isConductor: flags.isConductor, resolvedStockSize: quad.resolvedStockSize,
    stockSize: stock.stockSize, stockSizeOther: stock.stockSizeOther,
    issuedQty, stockCategory: stock.stockCategory,
    usesStockLedger: flags.usesStockLedger, isCat6: flags.isCat6, isQuad: flags.isQuad,
    stockUnit: stock.stockUnit, stockCatalogDefaultUnit: vm.catalogs.stockCatalog.defaultUnit,
    closingRate, closingValue, isUpcast: flags.isUpcast, isPvc: flags.isPvc,
    stockType: stock.stockType, stockNotes: stock.stockNotes, stockPhotos: stock.stockPhotos,
    ...upcastSubmitFields(vm.upcast), fail,
  });
}

export function submitStockFromVm(vm: TodayHubVm, fail: FailFn): Promise<SubmitOutcome> {
  const { issuedQty, closingRate, closingValue } = stockClosingRate(vm.stock);
  if (vm.flags.isQuad && vm.stock.stockKind === "raw") {
    return submitStockQuadRawFromVm(vm, fail, issuedQty, closingRate, closingValue);
  }
  if (vm.flags.isQuad) return submitStockQuadCableFromVm(vm, fail, issuedQty, closingRate);
  return submitStockOtherFromVm(vm, fail, issuedQty, closingRate, closingValue);
}
