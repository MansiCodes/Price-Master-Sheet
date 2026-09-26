import { Button } from "@/components/ui/Button";
import { LineEditorItemFields } from "@/components/today/LineEditorItemFields";
import { LineEditorValueFields } from "@/components/today/LineEditorValueFields";
import { newLine, type LineItem } from "@/components/today/today-hub-model";

export function LineEditor({
  lines,
  onChange,
  defaultUnit,
  itemLabel = "Item",
  itemOptions,
  itemPlaceholder,
  unitOptions,
  resolveUnitForItem,
  showGst = false,
  showCat6MeterFields = false,
  showDebitQty = false,
  sizeQtyUnitRow = false,
  rateLabel = "Rate (per unit)",
}: {
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  defaultUnit: string;
  itemLabel?: string;
  itemOptions?: readonly string[];
  itemPlaceholder?: string;
  unitOptions?: readonly string[];
  resolveUnitForItem?: (item: string) => string | undefined;
  showGst?: boolean;
  showCat6MeterFields?: boolean;
  showDebitQty?: boolean;
  /** Put item/size + Qty + Unit on one row (Rate below). */
  sizeQtyUnitRow?: boolean;
  rateLabel?: string;
}) {
  return (
    <div className="line-stack">
      {lines.map((line, idx) => (
        <div key={line.id} className="line-stack__card">
          <LineEditorItemFields
            line={line}
            idx={idx}
            lines={lines}
            onChange={onChange}
            itemLabel={itemLabel}
            itemOptions={itemOptions}
            itemPlaceholder={itemPlaceholder}
            unitOptions={unitOptions}
            resolveUnitForItem={resolveUnitForItem}
            sizeQtyUnitRow={sizeQtyUnitRow}
          />
          <LineEditorValueFields
            line={line}
            idx={idx}
            lines={lines}
            onChange={onChange}
            unitOptions={unitOptions}
            showGst={showGst}
            showCat6MeterFields={showCat6MeterFields}
            showDebitQty={showDebitQty}
            sizeQtyUnitRow={sizeQtyUnitRow}
            rateLabel={rateLabel}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([
            ...lines,
            newLine(
              resolveUnitForItem?.(itemOptions?.find((o) => o) ?? "") ??
                defaultUnit,
              "",
            ),
          ])
        }
        style={{ marginTop: "0.35rem" }}
      >
        + Add item
      </Button>
    </div>
  );
}
