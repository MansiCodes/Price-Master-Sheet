import {
  SheetColumns,
  SheetsError,
  type CableRate,
} from "./types";

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

function isHeaderRow(row: SheetRow): boolean {
  const joined = (row || [])
    .map((cell) => trimCell(cell).toLowerCase())
    .join(" | ");
  const name = trimCell(row[SheetColumns.NAME]).toLowerCase();
  const sNo = trimCell(row[SheetColumns.S_NO]).toLowerCase();

  return (
    name.includes("name of cable") ||
    name === "name" ||
    (name.includes("cable") && name.includes("name")) ||
    joined.includes("p=10") ||
    joined.includes("p=12") ||
    sNo === "s no." ||
    sNo === "s no" ||
    sNo === "sno"
  );
}

function isEmptyRow(row: SheetRow): boolean {
  const name = trimCell(row[SheetColumns.NAME]);
  const p10 = trimCell(row[SheetColumns.P10]);
  const p12 = trimCell(row[SheetColumns.P12]);
  const p15 = trimCell(row[SheetColumns.P15]);
  const p20 = trimCell(row[SheetColumns.P20]);
  return !name && !p10 && !p12 && !p15 && !p20;
}

function parseSerial(value: SheetCell): number | null {
  const raw = trimCell(value);
  if (!raw) {
    return null;
  }
  const num = Number.parseInt(raw.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(num) ? num : null;
}

/**
 * Shortens a long DESCRIPTION cell for UI display.
 */
export function shortenSpecification(
  value: SheetCell,
  maxLen = 88,
): { short: string; full: string } {
  const full = trimCell(value);
  if (!full) {
    return { short: "", full: "" };
  }

  if (full.length <= maxLen) {
    return { short: full, full };
  }

  const slice = full.slice(0, maxLen);
  const lastComma = slice.lastIndexOf(",");
  const cutAt = lastComma > Math.floor(maxLen * 0.45) ? lastComma : maxLen;
  return {
    short: `${slice.slice(0, cutAt).trim()}…`,
    full,
  };
}

/**
 * Maps Master List rows: B name, C description, I/J/K/L = P10/P12/P15/P20.
 */
export function mapSheetRowsToRates(
  rows: SheetRow[] | undefined | null,
): CableRate[] {
  if (!rows || rows.length === 0) {
    throw new SheetsError("No cable rate data found in the sheet", 404, "EMPTY_DATA");
  }

  const rates: CableRate[] = [];
  let headerSeen = false;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const rowNumber = i + 1;

    if (isEmptyRow(row)) {
      continue;
    }

    if (!headerSeen && isHeaderRow(row)) {
      headerSeen = true;
      continue;
    }

    if (!headerSeen) {
      continue;
    }

    const name = trimCell(row[SheetColumns.NAME]);
    if (!name) {
      continue;
    }

    try {
      const p10 = parseRate(row[SheetColumns.P10], rowNumber, "P=10%");
      const p12 = parseRate(row[SheetColumns.P12], rowNumber, "P=12%");
      const p15 = parseRate(row[SheetColumns.P15], rowNumber, "P=15%");
      const p20 = parseRate(row[SheetColumns.P20], rowNumber, "P=20%");
      const { short, full } = shortenSpecification(row[SheetColumns.DESCRIPTION]);

      rates.push({
        sNo: parseSerial(row[SheetColumns.S_NO]),
        name,
        specification: short,
        specificationFull: full,
        p10,
        p12,
        p15,
        p20,
      });
    } catch {
      // Skip rows with invalid price data
    }
  }

  if (rates.length === 0) {
    throw new SheetsError("No cable rate data found in the sheet", 404, "EMPTY_DATA");
  }

  return rates;
}

export function assertSheetStructure(
  rows: SheetRow[] | undefined | null,
): void {
  if (!rows || rows.length === 0) {
    throw new SheetsError("No cable rate data found in the sheet", 404, "EMPTY_DATA");
  }

  const headerRow = rows.find((row) => isHeaderRow(row ?? []));
  const probeRow = headerRow || rows.find((row) => !isEmptyRow(row ?? []));

  if (!probeRow) {
    throw new SheetsError("No cable rate data found in the sheet", 404, "EMPTY_DATA");
  }

  if (probeRow.length < SheetColumns.P20 + 1) {
    throw new SheetsError(
      "Sheet columns do not match the expected structure (NAME OF CABLE, P=10%, P=12%, P=15%, P=20%)",
      422,
      "INVALID_COLUMNS",
    );
  }
}
