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
  "Conductor",
  "Insulation",
  "Single Quad",
  "Laying",
  "Laying 1st part",
  "Laying 2nd part",
  "Inner Sheath",
  "Inner",
  "Screening",
  "Intermediate",
  "DST",
  "Outer Sheath",
  "Outer",
  "Armouring",
  "Coils",
  "Notes",
] as const;

/** Process production columns on the Stock sheet (Cable rows). */
export const QUAD_STOCK_PROCESS_HEADERS = [
  "Conductor",
  "Insulation",
  "Single Quad",
  "Laying",
  "Laying 1st part",
  "Laying 2nd part",
  "Inner Sheath",
  "Inner",
  "Screening",
  "Intermediate",
  "DST",
  "Outer Sheath",
  "Outer",
  "Armouring",
  "Coils",
] as const;

export type QuadStockProcessHeader =
  (typeof QUAD_STOCK_PROCESS_HEADERS)[number];
