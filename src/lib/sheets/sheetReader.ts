import { SheetsError } from "./types";
import { type SheetRow } from "./sheet-cells";
import {
  DEFAULT_COLS,
  isEmptyRow,
  isHeaderRow,
  resolveSheetColumns,
} from "./sheet-columns";

export type { SheetRow } from "./sheet-cells";
export { parseRate, trimCell } from "./sheet-cells";
export { resolveSheetColumns } from "./sheet-columns";
export { mapSheetRowsToRates, shortenSpecification } from "./sheet-map-rates";
export {
  mapHouseWirePerMeter,
  overlayHouseWirePerMeter,
} from "./sheet-house-wire";

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
