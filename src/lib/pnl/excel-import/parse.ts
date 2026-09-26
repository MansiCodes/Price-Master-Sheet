/**
 * Parse a multi-sheet P&L Excel workbook into typed draft rows.
 * Sheets (any of): Sales, Purchase / Purchases, Stock, Expense / Expenses / Misc Exp.
 * Header row is detected by known column aliases; missing columns stay blank/null.
 */
export type {
  ExpenseTarget,
  ParsedExpenseRow,
  ParsedPnlWorkbook,
  ParsedPurchaseRow,
  ParsedSaleRow,
  ParsedStockRow,
  ParseSkip,
} from "./parse/types";
export { parsePnlWorkbook } from "./parse/workbook";
export { resolveExpenseTarget } from "./parse/values";
