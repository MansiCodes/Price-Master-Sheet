import type {
  StockCallPutupItem,
  StockDispatchPendingItem,
  StockSaleItem,
} from "@/components/today/today-hub-model";
import type { WipCalcResult } from "@/lib/quad-signal-wip";
import {
  callPutupSpreads,
  dispatchSpreads,
  lockDispatchHistory,
  mappedCallPutupItems,
  mappedSaleItems,
} from "@/components/today/hub/build-quad-cable-notes-items";
import {
  applyOuterCallPutupClosing,
  sumCallPutupKm,
} from "@/components/today/hub/process-row-out-label";

export type QuadCableNotesPayloadArgs = {
  resolvedCable: string;
  resolvedSize: string;
  processes: Record<string, number>;
  openingQty: Record<string, number>;
  wip: WipCalcResult;
  stockWipSalesKm: number;
  stockCallPutupItems: StockCallPutupItem[];
  stockCallPutupLoadedItems: StockCallPutupItem[];
  stockCallPutupLoadedKm: number;
  stockDispatchPendingItems: StockDispatchPendingItem[];
  stockCallPutup: string;
  stockPutupDate: string;
  stockPartyName: string;
  stockDispatchPending: string;
  stockDispatchParty: string;
  stockSaleItems: StockSaleItem[];
  stockDispatchSettledKm: number;
  stockDispatchSettledItems: Array<{ qty: string; partyName: string }>;
  stockDispatchLoadedKm: number;
  stockDispatchLoadedItems: Array<{ qty: string; partyName: string }>;
  dispatchPending: number | undefined;
  selectedLengthLabel: string | undefined;
  sharedInsulationMeta:
    | {
        consumed: number;
        closing: number;
        contributions: Array<{
          size: string;
          layingProduced: number;
          coreCount: number;
          lengthFactor: number;
          consumed: number;
        }>;
      }
    | undefined;
  dstExcludesLaying?: boolean;
  powerLayingFactor?: number;
};

export function buildQuadCableNotesPayload(args: QuadCableNotesPayloadArgs) {
  const putups = mappedCallPutupItems(args.stockCallPutupItems);
  const formPutupKm = sumCallPutupKm(args.stockCallPutupItems);
  const callPutupOriginalKm = Math.max(
    Number(args.stockCallPutupLoadedKm) || 0,
    formPutupKm,
  );
  const closing = applyOuterCallPutupClosing(
    args.wip.byProcess,
    args.openingQty,
    args.processes,
    formPutupKm,
  );
  const locked = lockDispatchHistory({
    formItems: args.stockDispatchPendingItems,
    prevSettledKm: args.stockDispatchSettledKm,
    loadedKm: args.stockDispatchLoadedKm,
    prevSettledItems: args.stockDispatchSettledItems,
    loadedItems: args.stockDispatchLoadedItems,
  });
  const sales = mappedSaleItems(args.stockSaleItems);
  return {
    v: 2 as const,
    kind: "cable" as const,
    cable: args.resolvedCable,
    size: args.resolvedSize,
    production: args.processes,
    opening: args.openingQty,
    closing,
    processes: closing,
    salesKm: args.stockWipSalesKm,
    ...(putups.length > 0 ? { callPutupItems: putups } : {}),
    ...(callPutupOriginalKm > 0 ? { callPutupOriginalKm } : {}),
    ...(locked.pendingItems.length > 0 ? { dispatchPendingItems: locked.pendingItems } : {}),
    ...(sales.length > 0 ? { saleItems: sales } : {}),
    ...(locked.settledKm > 0 ? { dispatchSettledKm: locked.settledKm } : {}),
    ...(locked.settledItems.length > 0 ? { dispatchSettledItems: locked.settledItems } : {}),
    outerClosingIncludesPutup: true,
    ...callPutupSpreads(args),
    ...dispatchSpreads(args),
    calcSnapshot: { ...args.wip.calcSnapshot, drumLabel: args.selectedLengthLabel },
    ...(args.sharedInsulationMeta ? { sharedInsulation: args.sharedInsulationMeta } : {}),
    ...(args.dstExcludesLaying ? { dstExcludesLaying: true } : {}),
    ...(args.powerLayingFactor != null ? { powerLayingFactor: args.powerLayingFactor } : {}),
  };
}
