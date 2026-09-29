import { postJson } from "@/lib/client-forms";
import { encodeQuadSignalStockNotes } from "@/lib/plant-catalogs";
import { calculateQuadSignalWip, isSignallingCableName, resolveQuadSignalVariant } from "@/lib/quad-signal-wip";
import { signallingInsulationPool } from "@/components/today/hub/compute-quad-wip-calc";
import { buildQuadCableNotesPayload } from "@/components/today/hub/build-quad-cable-notes";
import type {
  ShiftKey,
  StockCallPutupItem,
  StockDispatchPendingItem,
  StockInsulationExtra,
  StockSaleItem,
  StockSingleQuadExtra,
} from "@/components/today/today-hub-model";
import type { FailFn, SubmitOutcome } from "@/components/today/hub/submit-types";
import {
  applyQuadCableProcessOverrides,
  parseNamedQtyMap,
} from "@/components/today/hub/submit-stock-quad-cable-wip";

export type SubmitStockQuadCableArgs = {
  plantId: string;
  entryDate: string;
  shift: ShiftKey;
  stockCable: string;
  stockCableOther: string;
  stockCableSize: string;
  stockCableSizeOther: string;
  quadCableProcessFields: string[];
  stockProcessQtys: Record<string, string>;
  stockWipOpening: Record<string, string>;
  stockLengthFactor: number | null;
  stockLengthOptions: Array<{ label: string; lengthFactor: number }>;
  stockInsulationExtras: StockInsulationExtra[];
  stockSingleQuadExtras: StockSingleQuadExtra[];
  stockWipSalesKm: number;
  stockUnit: string;
  issuedQty: number;
  closingRate: number;
  stockCallPutupItems: StockCallPutupItem[];
  stockDispatchPendingItems: StockDispatchPendingItem[];
  stockCallPutup: string;
  stockPutupDate: string;
  stockPartyName: string;
  stockDispatchPending: string;
  stockDispatchParty: string;
  stockSaleItems: StockSaleItem[];
  stockDispatchSettledKm: number;
  stockDispatchSettledItems: StockDispatchPendingItem[];
  stockDispatchLoadedKm: number;
  stockDispatchLoadedItems: StockDispatchPendingItem[];
  stockNotes: string;
  stockPhotos: string[];
  fail: FailFn;
};

function resolveCableAndSize(args: SubmitStockQuadCableArgs) {
  const resolvedCable =
    args.stockCable === "Other" ? args.stockCableOther.trim() : args.stockCable.trim();
  const resolvedSize =
    args.stockCableSize === "Other" ? args.stockCableSizeOther.trim() : args.stockCableSize.trim();
  if (!resolvedCable) {
    args.fail(args.stockCable === "Other" ? "Enter the other cable name." : "Select cable type.");
    return null;
  }
  if (!resolvedSize) {
    args.fail(args.stockCableSize === "Other" ? "Enter the other size." : "Select cable size.");
    return null;
  }
  return { resolvedCable, resolvedSize };
}

function parseDispatchPending(raw: string, fail: FailFn) {
  const dispatchPendingRaw = raw.trim();
  if (dispatchPendingRaw === "") return { ok: true as const, value: undefined };
  const n = Number(dispatchPendingRaw);
  if (!Number.isFinite(n) || n < 0) {
    fail("Dispatch pending must be a number ≥ 0.");
    return { ok: false as const };
  }
  return { ok: true as const, value: n };
}

function encodeSubmittedQuadCableNotes(
  args: SubmitStockQuadCableArgs,
  resolved: { resolvedCable: string; resolvedSize: string },
  processes: Record<string, number>,
  openingQty: Record<string, number>,
  wip: ReturnType<typeof calculateQuadSignalWip>,
  selectedLengthLabel: string | undefined,
  dispatchPending: number | undefined,
) {
  return encodeQuadSignalStockNotes(
    buildQuadCableNotesPayload({
      resolvedCable: resolved.resolvedCable,
      resolvedSize: resolved.resolvedSize,
      processes, openingQty, wip, stockWipSalesKm: args.stockWipSalesKm,
      stockCallPutupItems: args.stockCallPutupItems,
      stockDispatchPendingItems: args.stockDispatchPendingItems,
      stockCallPutup: args.stockCallPutup, stockPutupDate: args.stockPutupDate,
      stockPartyName: args.stockPartyName, stockDispatchPending: args.stockDispatchPending,
      stockDispatchParty: args.stockDispatchParty, dispatchPending, selectedLengthLabel,
      stockSaleItems: args.stockSaleItems,
      stockDispatchSettledKm: args.stockDispatchSettledKm,
      stockDispatchSettledItems: args.stockDispatchSettledItems,
      stockDispatchLoadedKm: args.stockDispatchLoadedKm,
      stockDispatchLoadedItems: args.stockDispatchLoadedItems,
      sharedInsulationMeta: isSignallingCableName(resolved.resolvedCable)
        ? {
            consumed: wip.insulationConsumed,
            closing: Number(wip.byProcess.Insulation) || 0,
            contributions: signallingInsulationPool(
              {
                resolvedQuadSizeName: resolved.resolvedSize,
                stockLengthFactor: args.stockLengthFactor,
                stockInsulationExtras: args.stockInsulationExtras,
                resolvedQuadCableName: resolved.resolvedCable,
                stockCable: resolved.resolvedCable,
              },
              processes,
            ).contributions,
          }
        : undefined,
    }),
    args.stockNotes.trim() || `Closing stock as on ${args.entryDate}`,
  );
}

async function postQuadCableStock(
  args: SubmitStockQuadCableArgs,
  resolved: { resolvedCable: string; resolvedSize: string },
  processes: Record<string, number>,
  openingQty: Record<string, number>,
  wip: ReturnType<typeof calculateQuadSignalWip>,
  selectedLengthLabel: string | undefined,
  dispatchPending: number | undefined,
) {
  const finishedQty =
    wip.finishedProcess != null ? (wip.byProcess[wip.finishedProcess] ?? args.issuedQty) : args.issuedQty;
  return postJson(`/api/plants/${args.plantId}/stock`, {
    date: args.entryDate,
    shift: args.shift,
    itemName: `${resolved.resolvedCable} · ${resolved.resolvedSize}`,
    category: "FG",
    unit: args.stockUnit || "KM",
    quantity: finishedQty,
    rate: args.closingRate,
    value: finishedQty * args.closingRate,
    notes: encodeSubmittedQuadCableNotes(
      args, resolved, processes, openingQty, wip, selectedLengthLabel, dispatchPending,
    ),
    photoUrls: args.stockPhotos,
  });
}

function computeQuadCableWip(args: SubmitStockQuadCableArgs) {
  const resolved = resolveCableAndSize(args);
  if (!resolved) return null;
  const processes = parseNamedQtyMap(args.quadCableProcessFields, args.stockProcessQtys, args.fail, "Production", false);
  if (!processes) return null;
  const openingQty = parseNamedQtyMap(args.quadCableProcessFields, args.stockWipOpening, args.fail, "Opening", true);
  if (!openingQty) return null;
  const variant = resolveQuadSignalVariant(resolved.resolvedSize);
  if (!variant) {
    args.fail("Could not resolve core count / length factor for this size.");
    return null;
  }
  const lengthFactor =
    args.stockLengthFactor != null && Number.isFinite(args.stockLengthFactor)
      ? args.stockLengthFactor
      : variant.lengthFactor;
  const overrides = applyQuadCableProcessOverrides({
    ...resolved, processes, stockInsulationExtras: args.stockInsulationExtras,
    stockSingleQuadExtras: args.stockSingleQuadExtras, fail: args.fail,
    stockLengthFactor: lengthFactor,
  });
  if (!overrides) return null;
  const wip = calculateQuadSignalWip({
    processes: args.quadCableProcessFields, opening: openingQty, production: processes,
    salesKm: args.stockWipSalesKm, coreCount: variant.coreCount, lengthFactor,
    insulationConsumedOverride: overrides.insulationConsumedOverride,
    singleQuadConsumedOverride: overrides.singleQuadConsumedOverride,
    sizeName: resolved.resolvedSize,
  });
  return { resolved, processes, openingQty, variant, lengthFactor, wip };
}

export async function submitStockQuadCable(args: SubmitStockQuadCableArgs): Promise<SubmitOutcome> {
  const computed = computeQuadCableWip(args);
  if (!computed) return { status: "failed" };
  const blocking = computed.wip.warnings.filter(
    (w) => !w.toLowerCase().includes("outbound"),
  );
  if (blocking.length > 0) {
    args.fail(blocking[0] ?? "WIP validation failed.");
    return { status: "failed" };
  }
  const pending = parseDispatchPending(args.stockDispatchPending, args.fail);
  if (!pending.ok) return { status: "failed" };
  const selectedLengthLabel =
    args.stockLengthOptions.find((o) => o.lengthFactor ===
      (args.stockLengthFactor != null && Number.isFinite(args.stockLengthFactor)
        ? args.stockLengthFactor
        : computed.variant.lengthFactor))?.label ?? computed.variant.drumLabel;
  const result = await postQuadCableStock(
    args, computed.resolved, computed.processes, computed.openingQty,
    computed.wip, selectedLengthLabel, pending.value,
  );
  return { status: "ok", result };
}
