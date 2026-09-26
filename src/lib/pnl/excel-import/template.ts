/**
 * Build a plant-specific multi-sheet P&L import template (.xlsx).
 * Columns mirror each plant's Today Entry / P&L forms.
 */
export type { PnlTemplateOptions } from "./template/build-pnl-template";
export { buildPnlImportTemplate } from "./template/build-pnl-template";
