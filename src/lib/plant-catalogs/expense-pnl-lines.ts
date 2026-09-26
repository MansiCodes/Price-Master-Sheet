import { normalizePvcExpenseHead, normalizeUpcastExpenseHead } from "./expense-normalize";

/** Maps PVC expense category to the matching P&L line label. */
export function pvcExpensePnlLine(head: string): string {
  switch (normalizePvcExpenseHead(head)) {
    case "Electricity":
    case "Fuel & Power":
      return "FUEL & POWER EXP.";
    case "Factory Rent":
      return "FACTORY RENT";
    case "FAR":
      return "DEPRECIATION";
    case "Financial Cost":
      return "FINANCIAL COST";
    case "Unloading of MT":
    case "Unloading MT":
      return "UNLOADING EXP.";
    case "Labour Contractor":
      return "LABOUR CONTRACTOR";
    case "Expense":
    case "Other":
      return "DIRECT EXP.";
    case "Petty Cash":
      return "PETTY CASH EXP";
    case "Salary Expenses":
      return "SALARY EXPENSES";
    case "Transport":
    case "Miscellaneous":
    case "Maintenance":
    case "Office":
      return "INDIRECT EXP.";
    default:
      return head;
  }
}

/** CAT-6 expense → P&L line. */
export function cat6ExpensePnlLine(head: string): string {
  switch (normalizePvcExpenseHead(head)) {
    case "Petty Cash":
      return "PETTY CASH EXP";
    case "FAR":
      return "DEPRECIATION";
    case "Financial Cost":
      return "FINANCIAL COST";
    case "Electricity":
    case "Fuel & Power":
      return "FUEL & POWER EXP";
    case "Factory Rent":
      return "FACTORY RENT";
    case "Other":
    case "Salary & Wages":
    case "Miscellaneous":
    case "Transport":
    case "Maintenance":
    case "Office":
      return "WAGES & SALARY EXP";
    default:
      return "WAGES & SALARY EXP";
  }
}

/** Short tab label for dense expense category bars (full name stays in aria-label). */
export function expenseHeadTabLabel(head: string): string {
  return head;
}

/** Split long expense category labels onto two lines for dense tab bars. */
export function expenseHeadLabelLines(head: string): [string, string] | null {
  if (head.trim() === "Miscellaneous") return null;
  const parts = head.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.length === 2) return [parts[0], parts[1]];
  if (parts.length === 3 && parts[1] === "&") {
    return [`${parts[0]} &`, parts[2]];
  }
  if (parts.length === 3) {
    return [parts[0], `${parts[1]} ${parts[2]}`];
  }
  const mid = Math.ceil(parts.length / 2);
  return [parts.slice(0, mid).join(" "), parts.slice(mid).join(" ")];
}

/** Upcast expense category → P&L line label (Excel wording). */
export function upcastExpensePnlLine(head: string): string {
  switch (normalizeUpcastExpenseHead(head)) {
    case "Fuel & Power":
    case "Electricity":
      return "FUEL & POWER EXP.";
    case "Unloading of MT":
      return "UNLOADING EXP.";
    case "Contractor Wages":
      return "CONTRACTOR WAGES";
    case "Consultancy Exp.":
      return "CONSULTANCY EXP.";
    case "Consumable Item":
      return "CONSUMABLE ITEM";
    case "Freight & Others":
      return "FREIGHT & OTHERS";
    case "Maintenance Item":
      return "MAINTENANCE ITEM";
    case "Travelling Charges":
      return "TRAVELLING CHARGES";
    case "Welfare Charges":
      return "WELFARE CHARGES";
    case "Other Charges":
      return "OTHER CHARGES";
    case "Miscellaneous":
      return "MISCELLANEOUS EXP.";
    case "Salary Expenses":
      return "SALARY EXPENSES";
    case "FAR":
      return "DEPRECIATION";
    case "Financial Cost":
      return "FINANCIAL COST";
    case "Factory Rent":
    case "Rent":
      return "FACTORY RENT";
    default:
      return head.trim().toUpperCase();
  }
}
