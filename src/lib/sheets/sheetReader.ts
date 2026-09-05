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
  const name = trimCell(row[1]).toLowerCase();
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

const DEFAULT_COLS: ResolvedSheetColumns = {
  sNo: SheetColumns.S_NO,
  name: SheetColumns.NAME,
  description: SheetColumns.DESCRIPTION,
  tab: SheetColumns.TAB,
  hyperlink: SheetColumns.HYPERLINK,
  rmCosting: SheetColumns.RM_COSTING,
  rmCostingPerMtr: SheetColumns.RM_COSTING_PER_MTR,
  rmCostingPerBox: SheetColumns.RM_COSTING_PER_BOX,
  p10: SheetColumns.P10,
  p12: SheetColumns.P12,
  p15: SheetColumns.P15,
  p20: SheetColumns.P20,
};

function headerIndex(
  headers: string[],
  match: (header: string) => boolean,
): number {
  return headers.findIndex(match);
}

/**
 * Resolve columns from header labels so Per Box / P% stay aligned even if
 * the sheet gains spacer or extra columns.
 */
export function resolveSheetColumns(headerRow: SheetRow): ResolvedSheetColumns {
  const headers = (headerRow || []).map((cell) => trimCell(cell).toLowerCase());
  const cols = { ...DEFAULT_COLS };

  const sNo = headerIndex(
    headers,
    (h) => h === "s no." || h === "s no" || h === "sno" || h.startsWith("s no"),
  );
  const name = headerIndex(
    headers,
    (h) => h.includes("name of cable") || h === "name",
  );
  const description = headerIndex(
    headers,
    (h) => h === "description" || h.includes("description"),
  );
  const tab = headerIndex(headers, (h) => h === "tab");
  const hyperlink = headerIndex(
    headers,
    (h) => h.includes("hyperlink") || h === "link",
  );
  const perBox = headerIndex(
    headers,
    (h) => h.includes("per box") || (h.includes("305") && h.includes("rm")),
  );
  const perMtr = headerIndex(
    headers,
    (h) => h.includes("per mtr") || h.includes("per meter"),
  );
  const rmCosting = headerIndex(
    headers,
    (h) =>
      h.includes("rm costing") &&
      !h.includes("per mtr") &&
      !h.includes("per meter") &&
      !h.includes("per box") &&
      !h.includes("305"),
  );
  const p10 = headerIndex(headers, (h) => /#?\s*p\s*=\s*10\s*%?/.test(h));
  const p12 = headerIndex(headers, (h) => /#?\s*p\s*=\s*12\s*%?/.test(h));
  const p15 = headerIndex(headers, (h) => /#?\s*p\s*=\s*15\s*%?/.test(h));
  const p20 = headerIndex(headers, (h) => /#?\s*p\s*=\s*20\s*%?/.test(h));

  if (sNo >= 0) cols.sNo = sNo;
  if (name >= 0) cols.name = name;
  if (description >= 0) cols.description = description;
  if (tab >= 0) cols.tab = tab;
  if (hyperlink >= 0) cols.hyperlink = hyperlink;
  if (rmCosting >= 0) cols.rmCosting = rmCosting;
  if (perMtr >= 0) cols.rmCostingPerMtr = perMtr;
  if (perBox >= 0) cols.rmCostingPerBox = perBox;
  if (p10 >= 0) cols.p10 = p10;
  if (p12 >= 0) cols.p12 = p12;
  if (p15 >= 0) cols.p15 = p15;
  if (p20 >= 0) cols.p20 = p20;

  return cols;
}

function isEmptyRow(row: SheetRow, cols: ResolvedSheetColumns): boolean {
  const name = trimCell(row[cols.name]);
  const rm = trimCell(row[cols.rmCosting]);
  const perMtr = trimCell(row[cols.rmCostingPerMtr]);
  const perBox = trimCell(row[cols.rmCostingPerBox]);
  const p10 = trimCell(row[cols.p10]);
  return !name && !rm && !perMtr && !perBox && !p10;
}

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
  let cols: ResolvedSheetColumns = { ...DEFAULT_COLS };

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

export function assertSheetStructure(
  rows: SheetRow[] | undefined | null,
): void {
  if (!rows || rows.length === 0) {
    throw new SheetsError("No cable rate data found in the sheet", 404, "EMPTY_DATA");
  }

  const headerRow = rows.find((row) => isHeaderRow(row ?? []));
  const cols = headerRow ? resolveSheetColumns(headerRow) : { ...DEFAULT_COLS };
  const probeRow =
    headerRow || rows.find((row) => !isEmptyRow(row ?? [], cols));

  if (!probeRow) {
    throw new SheetsError("No cable rate data found in the sheet", 404, "EMPTY_DATA");
  }

  if (probeRow.length < cols.p20 + 1) {
    throw new SheetsError(
      "Sheet columns do not match Master List (S NO…P=20%)",
      422,
      "INVALID_COLUMNS",
    );
  }
}
