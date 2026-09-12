/**
 * Shared Quad + Signal Stock Excel columns — used by import template,
 * import parser, and P&L export so forms / P&L / Excel stay aligned.
 */

/** Header row for Stock sheet (import template + export). */
export const QUAD_STOCK_SHEET_HEADERS = [
  "Date",
  "Shift",
  "Stock type",
  "Item",
  "Size",
  "Unit",
  "Qty",
  "Rate",
  "Value",
  "Sales km",
  "Drum length",
  "Insulation",
  "Single Quad",
  "Laying",
  "Inner Sheath",
  "Inner",
  "Screening",
  "Intermediate",
  "DST",
  "Outer Sheath",
  "Outer",
  "Armouring",
  "Notes",
] as const;

/** Process production columns on the Stock sheet (Cable rows). */
export const QUAD_STOCK_PROCESS_HEADERS = [
  "Insulation",
  "Single Quad",
  "Laying",
  "Inner Sheath",
  "Inner",
  "Screening",
  "Intermediate",
  "DST",
  "Outer Sheath",
  "Outer",
  "Armouring",
] as const;

export type QuadStockProcessHeader =
  (typeof QUAD_STOCK_PROCESS_HEADERS)[number];
