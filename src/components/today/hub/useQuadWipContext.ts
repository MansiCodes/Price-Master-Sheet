import { useEffect } from "react";
import type { ShiftKey } from "@/components/today/today-hub-model";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import {
  applyQuadWipContextData,
  resetQuadWipFields,
  resetQuadWipFieldsOnError,
  type QuadWipContextData,
  type QuadWipSetters,
} from "@/components/today/hub/apply-quad-wip-context";

function pickQuadWipSetters(stock: TodayHubStockState): QuadWipSetters {
  return {
    setStockWipOpening: stock.setStockWipOpening,
    setStockOpeningEditable: stock.setStockOpeningEditable,
    setStockWipContextLoading: stock.setStockWipContextLoading,
    setStockWipSalesKm: stock.setStockWipSalesKm,
    setStockWipSalesLines: stock.setStockWipSalesLines,
    setStockCallPutup: stock.setStockCallPutup,
    setStockPutupDate: stock.setStockPutupDate,
    setStockPartyName: stock.setStockPartyName,
    setStockDispatchPending: stock.setStockDispatchPending,
    setStockDispatchParty: stock.setStockDispatchParty,
    setStockCallPutupItems: stock.setStockCallPutupItems,
    setStockDispatchPendingItems: stock.setStockDispatchPendingItems,
    setStockLengthOptions: stock.setStockLengthOptions,
    setStockLengthFactor: stock.setStockLengthFactor,
    setStockInsulationExtras: stock.setStockInsulationExtras,
  };
}

function fetchQuadWipContext(
  ac: AbortController,
  args: { plantId: string; entryDate: string; shift: ShiftKey; cable: string; size: string },
  setters: QuadWipSetters,
  stockWipSalesLines: TodayHubStockState["stockWipSalesLines"],
) {
  setters.setStockWipContextLoading(true);
  const q = new URLSearchParams({
    date: args.entryDate, shift: args.shift, cable: args.cable, size: args.size,
  });
  fetch(`/api/plants/${args.plantId}/stock/quad-wip-context?${q}`, {
    signal: ac.signal, credentials: "include",
  })
    .then(async (res) => {
      if (!res.ok) throw new Error("Failed to load WIP context");
      return res.json() as Promise<QuadWipContextData & { sales: typeof stockWipSalesLines }>;
    })
    .then((data) => {
      if (ac.signal.aborted) return;
      applyQuadWipContextData(setters, data);
    })
    .catch((err) => {
      if (ac.signal.aborted) return;
      console.error(err);
      resetQuadWipFieldsOnError(setters);
    });
}

export function useQuadWipContext(
  isQuad: boolean,
  plantId: string,
  entryDate: string,
  shift: ShiftKey,
  stock: TodayHubStockState,
) {
  const { stockKind, resolvedQuadCableName, resolvedQuadSizeName, stockWipSalesLines } = stock;
  const setters = pickQuadWipSetters(stock);
  useEffect(() => {
    if (!isQuad || stockKind !== "cable") {
      resetQuadWipFields(setters);
      return;
    }
    if (!resolvedQuadCableName || !resolvedQuadSizeName) return;
    const ac = new AbortController();
    fetchQuadWipContext(
      ac, { plantId, entryDate, shift, cable: resolvedQuadCableName, size: resolvedQuadSizeName },
      setters, stockWipSalesLines,
    );
    return () => { ac.abort(); };
  }, [isQuad, stockKind, plantId, entryDate, shift, resolvedQuadCableName, resolvedQuadSizeName]);
}
