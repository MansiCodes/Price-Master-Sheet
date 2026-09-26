import { useMemo } from "react";
import { usesExpenseSections } from "@/lib/plant-catalogs";
import { isCat6Plant, isQuadSignalPlant } from "@/lib/plant-layout";
import { CONDUCTOR_SALE_TYPES, SALE_TYPES } from "@/components/today/today-hub-model";
import { allowedEntryKinds, allowedModuleKeys } from "@/components/today/hub/today-hub-allowed-kinds";

export function useTodayHubFlags(
  plantCode: string,
  userRole: string,
  canAccessStock: boolean,
) {
  const isPvc = plantCode.toUpperCase() === "PVC";
  const isUpcast = plantCode.toUpperCase() === "UPCAST";
  const isQuad = isQuadSignalPlant(plantCode);
  const isConductor = plantCode.toUpperCase() === "CONDUCTOR";
  const saleTypeOptions = isConductor ? CONDUCTOR_SALE_TYPES : SALE_TYPES;
  const isPvcStyleExpense = isPvc || isUpcast;
  /** Closing stock with RM/WIP/FG + rate × value (Excel ERS / PVC style). */
  const usesStockLedger = isPvc || isUpcast;
  const isCat6 = isCat6Plant(plantCode);
  const hasExpenseSections = usesExpenseSections(plantCode);
  const accountantOnly = userRole === "ACCOUNTANT";
  const stockEntryOnly = userRole === "MACHINE_SUPERVISOR" && canAccessStock;
  const kinds = useMemo(() => allowedEntryKinds(accountantOnly, stockEntryOnly), [accountantOnly, stockEntryOnly]);
  const modules = useMemo(() => allowedModuleKeys(accountantOnly, stockEntryOnly), [accountantOnly, stockEntryOnly]);
  return {
    isPvc, isUpcast, isQuad, isConductor, saleTypeOptions, isPvcStyleExpense,
    usesStockLedger, isCat6, hasExpenseSections, accountantOnly, stockEntryOnly,
    allowedEntryKinds: kinds, allowedModuleKeys: modules,
  };
}

export type TodayHubFlags = ReturnType<typeof useTodayHubFlags>;
