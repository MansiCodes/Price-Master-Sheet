/** Normalize legacy expense labels to current catalog names. */
export function normalizePvcExpenseHead(head: string): string {
  const h = head.trim();
  if (h === "Electricity" || h === "Fuel & Power") return "Fuel & Power";
  if (h === "Depreciation (FAR)" || h === "Depreciation") return "FAR";
  if (h === "Unloading MT") return "Unloading of MT";
  if (h === "Rent") return "Factory Rent";
  return h;
}

/** Normalize Upcast Misc / Excel natures to catalog expense heads. */
export function normalizeUpcastExpenseHead(head: string): string {
  const h = head.replace(/\s+/g, " ").trim();
  const key = h.toUpperCase();
  const map: Record<string, string> = {
    ELECTRICITY: "Fuel & Power",
    "FUEL & POWER": "Fuel & Power",
    "FUEL & POWER EXP.": "Fuel & Power",
    "FUEL & POWER EXP": "Fuel & Power",
    "UNLOADING OF MT": "Unloading of MT",
    "UNLOADING MT": "Unloading of MT",
    "UNLOADING EXP.": "Unloading of MT",
    "UNLOADING EXP": "Unloading of MT",
    "CONTRACTOR WAGES": "Contractor Wages",
    "LABOUR CONTRACTOR": "Contractor Wages",
    "CONSULTANCY EXP.": "Consultancy Exp.",
    "CONSULTANCY EXP": "Consultancy Exp.",
    "CONSUMABLE ITEM": "Consumable Item",
    "FREIGHT & OTHERS": "Freight & Others",
    "GRAPHITE FLAKES": "Freight & Others",
    "MAINTENANCE ITEM": "Maintenance Item",
    "TRAVELLING CHARGES": "Travelling Charges",
    "WELFARE CHARGES": "Welfare Charges",
    "OTHER CHARGES": "Other Charges",
    "SALARY EXPNES": "Salary Expenses",
    "SALARY EXPENSE": "Salary Expenses",
    "SALARY EXPENSES": "Salary Expenses",
    "FACTORY RENT": "Factory Rent",
    FAR: "FAR",
    "DEPRECIATION (FAR)": "Depreciation",
    DEPRECIATION: "Depreciation",
    "FINANCIAL COST": "Financial Cost",
  };
  return map[key] ?? h;
}

/** Prefer Nature when the category is Miscellaneous (Today / Excel). */
export function upcastEntryHead(
  expenseHead: string,
  nature?: string | null,
): string {
  const head = normalizeUpcastExpenseHead(expenseHead || nature || "");
  if (head === "Miscellaneous" || head === "Other Charges") {
    const fromNature = normalizeUpcastExpenseHead(nature || "");
    if (
      fromNature &&
      fromNature !== "Miscellaneous" &&
      fromNature !== "Other Charges"
    ) {
      return fromNature;
    }
    return "";
  }
  return head;
}

const TYPED_EXPENSE_HEADS = new Set([
  "Miscellaneous",
  "Other",
  "Other Charges",
  "Expense",
]);

export function isTypedExpenseCategory(category: string) {
  return TYPED_EXPENSE_HEADS.has(category.trim());
}

/** Sub-type shown in Misc / Other registers (nature, or the stored head). */
export function expenseTypeLabel(
  expenseHead: string | null | undefined,
  nature?: string | null,
): string {
  const rawHead = (expenseHead ?? "").trim();
  const nat = (nature ?? "").trim();
  const head = normalizeUpcastExpenseHead(rawHead);
  const fromNat = nat ? normalizeUpcastExpenseHead(nat) : "";
  if (TYPED_EXPENSE_HEADS.has(rawHead) && fromNat) return fromNat;
  return head || fromNat || "Other";
}

export function expenseTypeTotalLabel(type: string) {
  const short = type.replace(/\s+(Item|Exp\.?|Charges)$/i, "").trim() || type;
  return `Total ${short}`;
}
