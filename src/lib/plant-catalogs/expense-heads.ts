/** PVC expense categories aligned with P&L indirect/direct lines. */
export const PVC_EXPENSE_SECTIONS = [
  { value: "direct", label: "Direct Expense" },
  { value: "indirect", label: "Indirect Expense" },
] as const;

export type PvcExpenseSection =
  (typeof PVC_EXPENSE_SECTIONS)[number]["value"];

/** Direct expenses (P&L trading account). */
export const PVC_DIRECT_EXPENSE_HEADS = [
  "Fuel & Power",
  "Labour Contractor",
  "Expense",
  "Other",
] as const;

/** Indirect expenses (P&L below gross profit). */
export const PVC_INDIRECT_EXPENSE_HEADS = [
  "Petty Cash",
  "Salary Expenses",
  "FAR",
  "Financial Cost",
  "Factory Rent",
  "Transport",
  "Miscellaneous",
] as const;

export const PVC_EXPENSE_HEADS = [
  ...PVC_DIRECT_EXPENSE_HEADS,
  ...PVC_INDIRECT_EXPENSE_HEADS,
] as const;

/** @deprecated use PVC_DIRECT/INDIRECT_EXPENSE_HEADS */
export const PVC_LEGACY_EXPENSE_HEADS = PVC_EXPENSE_HEADS;

/**
 * CAT-6 expense UI mirrors Direct / Indirect.
 * Direct Petty Cash → P&L PETTY CASH EXP (trading / direct side).
 * Direct Other / Indirect Salary & Wages / Miscellaneous → WAGES & SALARY EXP.
 */
export const CAT6_DIRECT_EXPENSE_HEADS = [
  "Electricity",
  "Petty Cash",
  "Other",
] as const;

export const CAT6_INDIRECT_EXPENSE_HEADS = [
  "Salary & Wages",
  "Miscellaneous",
  "FAR",
  "Factory Rent",
] as const;

export const CAT6_EXPENSE_HEADS = [
  ...CAT6_DIRECT_EXPENSE_HEADS,
  ...CAT6_INDIRECT_EXPENSE_HEADS,
] as const;

/** LED Rope — Direct/Indirect; Electricity + Rent aligned with PVC-style plants. */
export const LED_DIRECT_EXPENSE_HEADS = [
  "Electricity",
  "Other",
] as const;

export const LED_INDIRECT_EXPENSE_HEADS = [
  "Salary & Wages",
  "Miscellaneous",
  "FAR",
  "Factory Rent",
] as const;

export const LED_EXPENSE_HEADS = [
  ...LED_DIRECT_EXPENSE_HEADS,
  ...LED_INDIRECT_EXPENSE_HEADS,
] as const;

/**
 * Upcast expense UI: Electricity / Rent like PVC, plus Misc natures from Excel.
 * P&L still breaks Misc natures into Excel lines (Consultancy, Consumable, …).
 */
export const UPCAST_DIRECT_EXPENSE_HEADS = [
  "Electricity",
  "Unloading of MT",
  "Contractor Wages",
  "Miscellaneous",
] as const;

export const UPCAST_INDIRECT_EXPENSE_HEADS = [
  "Salary Expenses",
  "FAR",
  "Financial Cost",
  "Factory Rent",
] as const;

export const UPCAST_EXPENSE_HEADS = [
  ...UPCAST_DIRECT_EXPENSE_HEADS,
  ...UPCAST_INDIRECT_EXPENSE_HEADS,
] as const;

/** Excel Misc Exp. factory natures → P&L DIRECT lines (entered via Miscellaneous). */
export const UPCAST_MISC_NATURES = [
  "Consultancy Exp.",
  "Consumable Item",
  "Freight & Others",
  "Maintenance Item",
  "Travelling Charges",
  "Welfare Charges",
  "Other Charges",
] as const;

/** @deprecated use UPCAST_MISC_NATURES */
export const UPCAST_MISC_DIRECT_HEADS = UPCAST_MISC_NATURES;

/** @deprecated prefer plant-specific heads / getExpenseHeadsForSection */
export const DEFAULT_EXPENSE_HEADS = CAT6_EXPENSE_HEADS;

export const PVC_FAR_VENDORS = [
  "Choudhary Enterprises",
  "Perfect Traders",
  "Other",
] as const;

export const PVC_FAR_DEP_PERCENT = 18.1;

/** Default unloading rate used when user leaves rate blank (Excel G156). */
export const PVC_UNLOADING_RATE_PER_MT = 70;
