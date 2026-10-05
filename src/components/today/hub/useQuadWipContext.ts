import { useEffect, useRef } from "react";
import type { ShiftKey } from "@/components/today/today-hub-model";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import {
  applyQuadWipContextData,
  resetQuadWipFields,
  resetQuadWipFieldsOnError,
  type QuadWipContextData,
  type QuadWipSetters,
} from "@/components/today/hub/apply-quad-wip-context";
import { isSignallingCableName } from "@/lib/quad-signal-wip";

function pickQuadWipSetters(stock: TodayHubStockState): QuadWipSetters {
  return {
    setStockWipOpening: stock.setStockWipOpening,
    setStockOpeningEditable: stock.setStockOpeningEditable,
    setStockWipContextLoading: stock.setStockWipContextLoading,
    setStockWipSalesKm: stock.setStockWipSalesKm,
    setStockOrderPutupKm: stock.setStockOrderPutupKm,
    setStockWipSalesLines: stock.setStockWipSalesLines,
    setStockCallPutup: stock.setStockCallPutup,
    setStockPutupDate: stock.setStockPutupDate,
    setStockPartyName: stock.setStockPartyName,
    setStockDispatchPending: stock.setStockDispatchPending,
    setStockDispatchParty: stock.setStockDispatchParty,
    setStockCallPutupItems: stock.setStockCallPutupItems,
    setStockCallPutupLoadedItems: stock.setStockCallPutupLoadedItems,
    setStockCallPutupLoadedKm: stock.setStockCallPutupLoadedKm,
    setStockDispatchPendingItems: stock.setStockDispatchPendingItems,
    setStockSaleItems: stock.setStockSaleItems,
    setStockSaleHints: stock.setStockSaleHints,
    setStockDispatchSettledKm: stock.setStockDispatchSettledKm,
    setStockDispatchSettledItems: stock.setStockDispatchSettledItems,
    setStockDispatchLoadedKm: stock.setStockDispatchLoadedKm,
    setStockDispatchLoadedItems: stock.setStockDispatchLoadedItems,
    setStockLengthOptions: stock.setStockLengthOptions,
    setStockLengthFactor: stock.setStockLengthFactor,
    setStockInsulationExtras: stock.setStockInsulationExtras,
    setStockInsulationExtrasOpen: stock.setStockInsulationExtrasOpen,
    setStockPowerLayingFactor: stock.setStockPowerLayingFactor,
    setStockProcessQtys: stock.setStockProcessQtys,
    setStockProcessHints: stock.setStockProcessHints,
  };
}

function fetchQuadWipContext(
  ac: AbortController,
  args: { plantId: string; entryDate: string; shift: ShiftKey; cable: string; size: string },
  setters: QuadWipSetters,
  stockWipSalesLines: TodayHubStockState["stockWipSalesLines"],
  preserveInsulation: boolean,
) {
  if (!preserveInsulation) setters.setStockWipContextLoading(true);
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
      applyQuadWipContextData(setters, data, { preserveInsulation });
    })
    .catch((err) => {
      if (ac.signal.aborted) return;
      console.error(err);
      if (preserveInsulation) {
        setters.setStockWipContextLoading(false);
        return;
      }
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
  const lastKey = useRef({
    plantId: "",
    entryDate: "",
    shift: "" as ShiftKey | "",
    cable: "",
    size: "",
  });
  useEffect(() => {
    if (!isQuad || stockKind !== "cable") {
      resetQuadWipFields(setters);
      lastKey.current = { plantId: "", entryDate: "", shift: "", cable: "", size: "" };
      return;
    }
    if (!resolvedQuadCableName || !resolvedQuadSizeName) return;
    const prev = lastKey.current;
    const preserveInsulation =
      isSignallingCableName(resolvedQuadCableName) &&
      prev.plantId === plantId &&
      prev.entryDate === entryDate &&
      prev.shift === shift &&
      prev.cable === resolvedQuadCableName &&
      prev.cable !== "";
    lastKey.current = {
      plantId,
      entryDate,
      shift,
      cable: resolvedQuadCableName,
      size: resolvedQuadSizeName,
    };
    const ac = new AbortController();
    fetchQuadWipContext(
      ac, { plantId, entryDate, shift, cable: resolvedQuadCableName, size: resolvedQuadSizeName },
      setters, stockWipSalesLines, preserveInsulation,
    );
    return () => { ac.abort(); };
  }, [isQuad, stockKind, plantId, entryDate, shift, resolvedQuadCableName, resolvedQuadSizeName]);
}
