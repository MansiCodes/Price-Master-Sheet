import { useState } from "react";
import { UPCAST_MISC_NATURES } from "@/lib/plant-catalogs";
import type { EntryKind, LineItem } from "@/components/today/today-hub-model";
import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import { useTodayHubExpenseCore } from "@/components/today/hub/useTodayHubExpenseCore";
import { useTodayHubExpenseReadings } from "@/components/today/hub/useTodayHubExpenseReadings";
import { useTodayHubExpenseFar } from "@/components/today/hub/useTodayHubExpenseFar";
import {
  useExpenseUnloadFetch,
  useExpensePowerAmount,
} from "@/components/today/hub/useTodayHubExpenseEffects";

export function useTodayHubExpense(
  plantCode: string,
  flags: TodayHubFlags,
  kind: EntryKind,
  entryDate: string,
  plantId: string,
  purchaseLines: LineItem[],
) {
  const { isPvcStyleExpense, hasExpenseSections, isCat6, isUpcast, isQuad } = flags;
  const core = useTodayHubExpenseCore(plantCode, hasExpenseSections);
  const readings = useTodayHubExpenseReadings();
  const far = useTodayHubExpenseFar();
  const [fetchedPurchaseKg, setFetchedPurchaseKg] = useState<number>(0);
  const [upcastMiscNature, setUpcastMiscNature] = useState<string>(UPCAST_MISC_NATURES[0]);
  const [expensePayMode, setExpensePayMode] = useState<"Cash" | "Bank">("Cash");
  useExpenseUnloadFetch(isPvcStyleExpense, kind, core.expenseHead, entryDate, plantId, setFetchedPurchaseKg);
  useExpensePowerAmount(core.expenseHead, readings.expenseOpeningReading, readings.expenseClosingReading, readings.expenseRate, core.setExpenseAmount);
  const currentPurchaseKg = purchaseLines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  const effectivePurchaseKg = currentPurchaseKg > 0 ? currentPurchaseKg : fetchedPurchaseKg;
  const calculatedUnloadMt = (effectivePurchaseKg / 1000).toFixed(3);
  return {
    ...core, ...readings, ...far, fetchedPurchaseKg, upcastMiscNature, setUpcastMiscNature,
    expensePayMode, setExpensePayMode, calculatedUnloadMt, isCat6, isUpcast, isQuad,
  };
}

export type TodayHubExpense = ReturnType<typeof useTodayHubExpense>;
