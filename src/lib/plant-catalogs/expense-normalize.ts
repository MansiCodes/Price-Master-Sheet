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
    ELECTRICITY: "Electricity",
    "FUEL & POWER": "Electricity",
    "FUEL & POWER EXP.": "Electricity",
    "FUEL & POWER EXP": "Electricity",
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
    "MAINTENANCE ITEM": "Maintenance Item",
    "TRAVELLING CHARGES": "Travelling Charges",
    "WELFARE CHARGES": "Welfare Charges",
    "OTHER CHARGES": "Other Charges",
    "SALARY EXPNES": "Salary Expenses",
    "SALARY EXPENSE": "Salary Expenses",
    "SALARY EXPENSES": "Salary Expenses",
    "FACTORY RENT": "Factory Rent",
    FAR: "FAR",
    "DEPRECIATION (FAR)": "FAR",
    DEPRECIATION: "FAR",
    "FINANCIAL COST": "Financial Cost",
  };
  return map[key] ?? h;
}
