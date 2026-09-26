import { useMemo } from "react";
import { getQuadSignalCableProcesses } from "@/lib/plant-catalogs";
import { isQuadCableName, isSignallingCableName } from "@/lib/quad-signal-wip";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import type { TodayHubCatalogs } from "@/components/today/hub/useTodayHubCatalogs";
import { buildQuadCableSizeOptions } from "@/components/today/hub/build-quad-cable-size-options";
import {
  useQuadCableUnitEffect,
  useQuadCableSizeResetEffect,
} from "@/components/today/hub/useQuadWipDerivedEffects";

export function useQuadWipDerived(
  isQuad: boolean,
  stock: TodayHubStockState,
  catalogs: TodayHubCatalogs,
) {
  const { stockKind, stockCable, stockCableSize, resolvedQuadCableName } = stock;
  const quadCableSizeOptions = useMemo(
    () => buildQuadCableSizeOptions(stockCable, catalogs.customStockItems),
    [stockCable, catalogs.customStockItems],
  );
  const quadCableProcessFields = useMemo(() => {
    if (!isQuad || stockKind !== "cable") return [] as string[];
    const cableKey = stockCable === "Other" ? "Other" : stockCable;
    return [...getQuadSignalCableProcesses(cableKey)];
  }, [isQuad, stockKind, stockCable]);
  useQuadCableUnitEffect(isQuad, stockKind, stock.setStockUnit);
  useQuadCableSizeResetEffect(isQuad, stockKind, stockCable, stockCableSize, quadCableSizeOptions, stock);
  const cableName = resolvedQuadCableName || stockCable;
  return {
    quadCableSizeOptions,
    quadCableProcessFields,
    isSignallingStock: isQuad && stockKind === "cable" && isSignallingCableName(cableName),
    isQuadCableStock: isQuad && stockKind === "cable" && isQuadCableName(cableName),
  };
}

export type QuadWipDerived = ReturnType<typeof useQuadWipDerived>;
