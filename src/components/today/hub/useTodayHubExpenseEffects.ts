import { useEffect } from "react";
import type { EntryKind } from "@/components/today/today-hub-model";

export function useExpenseUnloadFetch(
  isPvcStyleExpense: boolean,
  kind: EntryKind,
  expenseHead: string,
  entryDate: string,
  plantId: string,
  setFetchedPurchaseKg: (qty: number) => void,
) {
  useEffect(() => {
    if (
      isPvcStyleExpense &&
      kind === "expense" &&
      (expenseHead === "Unloading of MT" || expenseHead === "Unloading MT") &&
      entryDate
    ) {
      fetch(
        `/api/plants/${plantId}/purchases?from=${encodeURIComponent(entryDate)}&to=${encodeURIComponent(entryDate)}`,
      )
        .then((res) => res.json())
        .then((data) => {
          setFetchedPurchaseKg(Number(data?.totals?.quantity) || 0);
        })
        .catch(() => setFetchedPurchaseKg(0));
    }
  }, [isPvcStyleExpense, kind, expenseHead, entryDate, plantId, setFetchedPurchaseKg]);
}

export function useExpensePowerAmount(
  expenseHead: string,
  expenseOpeningReading: string,
  expenseClosingReading: string,
  expenseRate: string,
  setExpenseAmount: (amt: string) => void,
) {
  useEffect(() => {
    if (expenseHead === "Electricity" || expenseHead === "Fuel & Power") {
      const opening = Number(expenseOpeningReading) || 0;
      const closing = Number(expenseClosingReading) || 0;
      const rate = Number(expenseRate) || 0;
      const consumed = Math.max(0, closing - opening);
      const calculatedAmt = consumed * rate;
      setExpenseAmount(calculatedAmt > 0 ? String(calculatedAmt.toFixed(2)) : "");
    }
  }, [expenseOpeningReading, expenseClosingReading, expenseRate, expenseHead, setExpenseAmount]);
}
