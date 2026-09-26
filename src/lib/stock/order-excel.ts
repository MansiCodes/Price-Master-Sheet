/**
 * Parse Pending Order Excel (Railway + Private sheets) for Quad + Signal Stock.
 * Size match uses digit + first letter of words (12 Core → 12c, 6Q → 6q).
 * Qty in meters is converted to km.
 */
export type {
  ParseStockOrdersResult,
  StockOrderBySize,
  StockOrderPartyLine,
} from "@/lib/stock/order-excel-types";
export { lookupStockOrder, orderKey, toSizeMatchKey } from "@/lib/stock/order-excel-types";
export { matchCableAndSize, qtyToKm } from "./order-excel-match";
export { parseStockOrdersExcel } from "./order-excel-parse";
