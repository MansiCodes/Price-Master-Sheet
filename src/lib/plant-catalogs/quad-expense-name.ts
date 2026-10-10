import { isQuadSignalPlant } from "@/lib/plant-layout";

/** Direct Other / Indirect Miscellaneous on Quad + Signal. */
export const QUAD_NAMED_EXPENSE_HEADS = ["Other", "Miscellaneous"] as const;

export const QUAD_EXPENSE_NAME_EXAMPLES = [
  "Labour Wages",
  "Staff Salary",
  "Overtime Wages",
  "Loading/Unloading",
  "Transport Charges",
  "Repairs and Maintenance",
  "Stationery",
  "Cleaning Supplies",
  "Other Consumables",
] as const;

export function requiresExpenseName(
  plantCode: string | null | undefined,
  expenseHead: string | null | undefined,
): boolean {
  if (!isQuadSignalPlant(plantCode)) return false;
  const head = String(expenseHead ?? "").trim();
  return (QUAD_NAMED_EXPENSE_HEADS as readonly string[]).includes(head);
}

export function expenseNameMissingMessage(): string {
  return "Enter an expense name for Miscellaneous or Direct Other (e.g. Labour Wages, Transport Charges).";
}

export function namedExpenseDescription(
  plantCode: string | null | undefined,
  expenseHead: string,
  expenseName: string | null | undefined,
): { ok: true; value: string } | { ok: false; error: string } {
  const text = String(expenseName ?? "").trim();
  if (requiresExpenseName(plantCode, expenseHead) && !text) {
    return { ok: false, error: expenseNameMissingMessage() };
  }
  return { ok: true, value: text };
}
