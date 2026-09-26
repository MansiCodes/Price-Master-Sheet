import type {
  StockCallPutupItem,
  StockDispatchPendingItem,
} from "@/components/today/today-hub-model";
import type { WipCalcResult } from "@/lib/quad-signal-wip";
import {
  callPutupSpreads,
  dispatchSpreads,
  mappedCallPutupItems,
  mappedDispatchItems,
} from "@/components/today/hub/build-quad-cable-notes-items";

export type QuadCableNotesPayloadArgs = {
  resolvedCable: string;
  resolvedSize: string;
  processes: Record<string, number>;
  openingQty: Record<string, number>;
  wip: WipCalcResult;
  stockWipSalesKm: number;
  stockCallPutupItems: StockCallPutupItem[];
  stockDispatchPendingItems: StockDispatchPendingItem[];
  stockCallPutup: string;
  stockPutupDate: string;
  stockPartyName: string;
  stockDispatchPending: string;
  stockDispatchParty: string;
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
};

export function buildQuadCableNotesPayload(args: QuadCableNotesPayloadArgs) {
  const putups = mappedCallPutupItems(args.stockCallPutupItems);
  const dispatches = mappedDispatchItems(args.stockDispatchPendingItems);
  return {
    v: 2 as const,
    kind: "cable" as const,
    cable: args.resolvedCable,
    size: args.resolvedSize,
    production: args.processes,
    opening: args.openingQty,
    closing: args.wip.byProcess,
    processes: args.wip.byProcess,
    salesKm: args.stockWipSalesKm,
    ...(putups.length > 0 ? { callPutupItems: putups } : {}),
    ...(dispatches.length > 0 ? { dispatchPendingItems: dispatches } : {}),
    ...callPutupSpreads(args),
    ...dispatchSpreads(args),
    calcSnapshot: { ...args.wip.calcSnapshot, drumLabel: args.selectedLengthLabel },
    ...(args.sharedInsulationMeta ? { sharedInsulation: args.sharedInsulationMeta } : {}),
  };
}
