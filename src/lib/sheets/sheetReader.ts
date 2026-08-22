import {
  SheetColumns,
  SheetsError,
  type CableRate,
  type ResolvedSheetColumns,
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
  const sNo = trimCell(row[0]).toLowerCase();

  return (
    name.includes("name of cable") ||
    name === "name" ||
    (name.includes("cable") && name.includes("name")) ||
    joined.includes("p=10") ||
    joined.includes("p=12") ||
    joined.includes("rm costing") ||
    sNo === "s no." ||
    sNo === "s no" ||
    sNo === "sno"
  );
}

function findHeaderIndex(
  headers: string[],
  predicate: (header: string) => boolean,
): number {
  return headers.findIndex(predicate);
}

/**
 * Resolve column indexes from the Master List header row.
 * Prefer “RM Costing (Per Box=305Mtr)” for the app’s RM Costing Per Mtr column
 * (values like 9046.97), then #P=10% … #P=20%.
 */
export function resolveSheetColumns(headerRow: SheetRow): ResolvedSheetColumns {
  const headers = (headerRow || []).map((cell) => trimCell(cell).toLowerCase());

  const sNo = findHeaderIndex(
    headers,
    (h) => h === "s no." || h === "s no" || h === "sno" || h.startsWith("s no"),
  );
  const name = findHeaderIndex(
    headers,
    (h) =>
      h.includes("name of cable") ||
      h === "name" ||
      (h.includes("cable") && h.includes("name")),
  );
  const description = findHeaderIndex(headers, (h) =>
    h.includes("description"),
  );

  // User-facing “RM Costing Per Mtr” = sheet Per Box column (≈9046.97), not the
  // smaller “RM Costing Per Mtr” meter column (≈29.66).
  let rmCostingPerMtr = findHeaderIndex(
    headers,
    (h) =>
      h.includes("per box") ||
      (h.includes("rm costing") && h.includes("305")),
  );
  if (rmCostingPerMtr < 0) {
    rmCostingPerMtr = findHeaderIndex(
      headers,
      (h) => h.includes("rm costing") && h.includes("per mtr"),
    );
  }

  const p10 = findHeaderIndex(
    headers,
    (h) => h.includes("p=10") || h.includes("p = 10") || h.includes("# p=10"),
  );
  const p12 = findHeaderIndex(
    headers,
    (h) => h.includes("p=12") || h.includes("p = 12"),
  );
  const p15 = findHeaderIndex(
    headers,
    (h) => h.includes("p=15") || h.includes("p = 15"),
  );
  const p20 = findHeaderIndex(
    headers,
    (h) => h.includes("p=20") || h.includes("p = 20"),
  );

  const resolved: ResolvedSheetColumns = {
    sNo: sNo >= 0 ? sNo : SheetColumns.S_NO,
    name: name >= 0 ? name : SheetColumns.NAME,
    description: description >= 0 ? description : SheetColumns.DESCRIPTION,
    rmCostingPerMtr:
      rmCostingPerMtr >= 0 ? rmCostingPerMtr : SheetColumns.RM_COSTING_PER_MTR,
    p10: p10 >= 0 ? p10 : SheetColumns.P10,
    p12: p12 >= 0 ? p12 : SheetColumns.P12,
    p15: p15 >= 0 ? p15 : SheetColumns.P15,
    p20: p20 >= 0 ? p20 : SheetColumns.P20,
  };

  return resolved;
}

function isEmptyRow(row: SheetRow, cols: ResolvedSheetColumns): boolean {
  const name = trimCell(row[cols.name]);
  const rm = trimCell(row[cols.rmCostingPerMtr]);
  const p10 = trimCell(row[cols.p10]);
  const p12 = trimCell(row[cols.p12]);
  const p15 = trimCell(row[cols.p15]);
  const p20 = trimCell(row[cols.p20]);
  return !name && !rm && !p10 && !p12 && !p15 && !p20;
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
 * Maps Master List rows using header labels when present.
 * Columns: RM Costing Per Mtr (Per Box values) then P10 / P12 / P15 / P20.
 */
export function mapSheetRowsToRates(
  rows: SheetRow[] | undefined | null,
): CableRate[] {
  if (!rows || rows.length === 0) {
    throw new SheetsError("No cable rate data found in the sheet", 404, "EMPTY_DATA");
  }

  const rates: CableRate[] = [];
  let headerSeen = false;
  let cols: ResolvedSheetColumns = {
    sNo: SheetColumns.S_NO,
    name: SheetColumns.NAME,
    description: SheetColumns.DESCRIPTION,
    rmCostingPerMtr: SheetColumns.RM_COSTING_PER_MTR,
    p10: SheetColumns.P10,
    p12: SheetColumns.P12,
    p15: SheetColumns.P15,
    p20: SheetColumns.P20,
  };

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
      const rmCostingPerMtr = parseRate(
        row[cols.rmCostingPerMtr],
        rowNumber,
        "RM Costing Per Mtr",
      );
      const p10 = parseRate(row[cols.p10], rowNumber, "P=10%");
      const p12 = parseRate(row[cols.p12], rowNumber, "P=12%");
      const p15 = parseRate(row[cols.p15], rowNumber, "P=15%");
      const p20 = parseRate(row[cols.p20], rowNumber, "P=20%");
      const { short, full } = shortenSpecification(row[cols.description]);

      rates.push({
        sNo: parseSerial(row[cols.sNo]),
        name,
        specification: short,
        specificationFull: full,
        rmCostingPerMtr,
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
  const cols = headerRow
    ? resolveSheetColumns(headerRow)
    : {
        sNo: SheetColumns.S_NO,
        name: SheetColumns.NAME,
        description: SheetColumns.DESCRIPTION,
        rmCostingPerMtr: SheetColumns.RM_COSTING_PER_MTR,
        p10: SheetColumns.P10,
        p12: SheetColumns.P12,
        p15: SheetColumns.P15,
        p20: SheetColumns.P20,
      };

  const probeRow = headerRow || rows.find((row) => !isEmptyRow(row ?? [], cols));

  if (!probeRow) {
    throw new SheetsError("No cable rate data found in the sheet", 404, "EMPTY_DATA");
  }

  const needed = Math.max(
    cols.rmCostingPerMtr,
    cols.p10,
    cols.p12,
    cols.p15,
    cols.p20,
  );
  if (probeRow.length < needed + 1) {
    throw new SheetsError(
      "Sheet columns do not match the expected structure (RM Costing Per Mtr, P=10%, P=12%, P=15%, P=20%)",
      422,
      "INVALID_COLUMNS",
    );
  }
}
