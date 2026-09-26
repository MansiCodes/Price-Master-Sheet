import { SheetsError, type CableRate } from "./types";
import {
  parseRate,
  trimCell,
  type SheetCell,
  type SheetRow,
} from "./sheet-cells";
import {
  DEFAULT_COLS,
  isEmptyRow,
  isHeaderRow,
  resolveSheetColumns,
} from "./sheet-columns";

function parseSerial(value: SheetCell): number | null {
  const raw = trimCell(value);
  if (!raw) {
    return null;
  }
  const num = Number.parseInt(raw.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(num) ? num : null;
}

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
 * Maps Master List rows with every pricing column aligned to the sheet.
 */
export function mapSheetRowsToRates(
  rows: SheetRow[] | undefined | null,
): CableRate[] {
  if (!rows || rows.length === 0) {
    throw new SheetsError("No cable rate data found in the sheet", 404, "EMPTY_DATA");
  }

  const rates: CableRate[] = [];
  let headerSeen = false;
  let cols = { ...DEFAULT_COLS };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const rowNumber = i + 1;

    if (!headerSeen && isHeaderRow(row)) {
      cols = resolveSheetColumns(row);
      headerSeen = true;
      continue;
    }

    if (!headerSeen) {
      continue;
    }

    if (isEmptyRow(row, cols)) {
      continue;
    }

    const name = trimCell(row[cols.name]);
    if (!name) {
      continue;
    }

    try {
      const { short, full } = shortenSpecification(row[cols.description]);
      const softRate = (cell: SheetCell, label: string): number => {
        try {
          return parseRate(cell, rowNumber, label);
        } catch {
          return 0;
        }
      };
      rates.push({
        sNo: parseSerial(row[cols.sNo]),
        name,
        specification: short,
        specificationFull: full,
        tab: trimCell(row[cols.tab]),
        hyperlink: trimCell(row[cols.hyperlink]),
        rmCosting: softRate(row[cols.rmCosting], "RM Costing"),
        rmCostingPerMtr: softRate(
          row[cols.rmCostingPerMtr],
          "RM Costing Per Mtr",
        ),
        rmCostingPerBox: parseRate(
          row[cols.rmCostingPerBox],
          rowNumber,
          "RM Costing (Per Box=305Mtr)",
        ),
        p10: parseRate(row[cols.p10], rowNumber, "P=10%"),
        p12: parseRate(row[cols.p12], rowNumber, "P=12%"),
        p15: parseRate(row[cols.p15], rowNumber, "P=15%"),
        p20: parseRate(row[cols.p20], rowNumber, "P=20%"),
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
