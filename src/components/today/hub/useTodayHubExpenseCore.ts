import { useMemo, useState } from "react";
import {
  getExpenseHeads,
  getExpenseHeadsForSection,
  type PvcExpenseSection,
} from "@/lib/plant-catalogs";
import { initialExpenseHead } from "@/components/today/hub/initial-expense-head";

export function useTodayHubExpenseCore(
  plantCode: string,
  hasExpenseSections: boolean,
) {
  const [expenseSection, setExpenseSection] = useState<PvcExpenseSection>("direct");
  const expenseHeads = useMemo(
    () =>
      hasExpenseSections
        ? [...getExpenseHeadsForSection(plantCode, expenseSection)]
        : [...getExpenseHeads(plantCode)],
    [plantCode, hasExpenseSections, expenseSection],
  );
  const [expenseHead, setExpenseHead] = useState(() => initialExpenseHead(plantCode));
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  return {
    expenseSection,
    setExpenseSection,
    expenseHeads,
    expenseHead,
    setExpenseHead,
    expenseAmount,
    setExpenseAmount,
    paidTo,
    setPaidTo,
    expenseDesc,
    setExpenseDesc,
  };
}
