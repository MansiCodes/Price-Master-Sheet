import type { LineItem } from "@/components/today/today-hub-model";
import { LineEditorDebitValueFields } from "./LineEditorDebitValueFields";
import {
  LineEditorCompactRateFields,
  LineEditorMeterFields,
  LineEditorStandardValueFields,
} from "./line-editor-value-rows";

export function LineEditorValueFields({
  line,
  idx,
  lines,
  onChange,
  unitOptions,
  showGst,
  showCat6MeterFields,
  showDebitQty,
  sizeQtyUnitRow,
  rateLabel,
}: {
  line: LineItem;
  idx: number;
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  unitOptions?: readonly string[];
  showGst: boolean;
  showCat6MeterFields: boolean;
  showDebitQty: boolean;
  sizeQtyUnitRow: boolean;
  rateLabel: string;
}) {
  const shared = { line, idx, lines, onChange, unitOptions, showGst, rateLabel };
  return (
    <>
      {showDebitQty ? (
        <LineEditorDebitValueFields {...shared} />
      ) : sizeQtyUnitRow ? (
        <LineEditorCompactRateFields {...shared} />
      ) : (
        <LineEditorStandardValueFields {...shared} />
      )}
      {showCat6MeterFields ? <LineEditorMeterFields {...shared} /> : null}
    </>
  );
}
