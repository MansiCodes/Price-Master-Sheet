import {
  SheetColumns,
  type ResolvedSheetColumns,
} from "./types";
import { trimCell, type SheetRow } from "./sheet-cells";

export function isHeaderRow(row: SheetRow): boolean {
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

export const DEFAULT_COLS: ResolvedSheetColumns = {
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

export function isEmptyRow(row: SheetRow, cols: ResolvedSheetColumns): boolean {
  const name = trimCell(row[cols.name]);
  const rm = trimCell(row[cols.rmCosting]);
  const perMtr = trimCell(row[cols.rmCostingPerMtr]);
  const perBox = trimCell(row[cols.rmCostingPerBox]);
  const p10 = trimCell(row[cols.p10]);
  return !name && !rm && !perMtr && !perBox && !p10;
}
