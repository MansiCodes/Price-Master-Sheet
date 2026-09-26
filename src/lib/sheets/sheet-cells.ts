import { SheetsError } from "./types";

type SheetCell = string | number | boolean | null | undefined;
export type SheetRow = SheetCell[];

export function trimCell(value: SheetCell): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

export function parseRate(
  value: SheetCell,
  rowNumber: number,
  fieldName = "price",
): number {
  const raw = trimCell(value);

  if (!raw) {
    throw new SheetsError(
      `One or more price values could not be parsed as numbers (${fieldName}) at row ${rowNumber}`,
      422,
      "RATE_PARSING_ERROR",
    );
  }

  const normalized = raw.replace(/[^0-9.\-]/g, "");
  const rate = Number.parseFloat(normalized);

  if (!Number.isFinite(rate)) {
    throw new SheetsError(
      `One or more price values could not be parsed as numbers (${fieldName}) at row ${rowNumber}: "${raw}"`,
      422,
      "RATE_PARSING_ERROR",
    );
  }

  return rate;
}

export type { SheetCell };
