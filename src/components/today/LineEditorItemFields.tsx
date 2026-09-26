import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import type { LineItem } from "@/components/today/today-hub-model";

export function LineEditorItemFields({
  line,
  idx,
  lines,
  onChange,
  itemLabel,
  itemOptions,
  itemPlaceholder,
  unitOptions,
  resolveUnitForItem,
  sizeQtyUnitRow,
}: {
  line: LineItem;
  idx: number;
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  itemLabel: string;
  itemOptions?: readonly string[];
  itemPlaceholder?: string;
  unitOptions?: readonly string[];
  resolveUnitForItem?: (item: string) => string | undefined;
  sizeQtyUnitRow: boolean;
}) {
  return (
    <>
      {sizeQtyUnitRow ? (
        <div className="line-stack__row line-stack__row--meta has-unit cols-3">
          <div className="field" style={{ margin: 0, minWidth: 0 }}>
            <label htmlFor={`line-item-${line.id}`}>{itemLabel}</label>
            {itemOptions ? (
              <SelectMenu
                id={`line-item-${line.id}`}
                value={
                  itemOptions.includes(line.itemDescription)
                    ? line.itemDescription
                    : line.itemDescription === ""
                      ? ""
                      : itemOptions.includes("Other")
                        ? "Other"
                        : itemOptions.includes("Others")
                          ? "Others"
                          : itemOptions.includes("others")
                            ? "others"
                            : ""
                }
                options={itemOptions}
                placeholder={
                  itemPlaceholder ?? `Select ${itemLabel.toLowerCase()}`
                }
                onChange={(next) => {
                  const copy = [...lines];
                  const unit = next ? resolveUnitForItem?.(next) : undefined;
                  copy[idx] = {
                    ...line,
                    itemDescription: next,
                    ...(unit ? { unit } : {}),
                  };
                  onChange(copy);
                }}
              />
            ) : (
              <input
                id={`line-item-${line.id}`}
                value={line.itemDescription}
                onChange={(e) => {
                  const next = [...lines];
                  next[idx] = { ...line, itemDescription: e.target.value };
                  onChange(next);
                }}
                placeholder={itemLabel}
              />
            )}
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor={`line-qty-${line.id}`}>Qty</label>
            <DecimalInput
              id={`line-qty-${line.id}`}
              value={line.quantity}
              onChange={(quantity) => {
                const next = [...lines];
                next[idx] = { ...line, quantity };
                onChange(next);
              }}
            />
          </div>
          {unitOptions ? (
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor={`line-unit-${line.id}`}>Unit</label>
              <SelectMenu
                id={`line-unit-${line.id}`}
                value={
                  unitOptions.some((u) => u === line.unit)
                    ? line.unit
                    : unitOptions[0] || line.unit
                }
                options={unitOptions}
                onChange={(unit) => {
                  const next = [...lines];
                  next[idx] = { ...line, unit };
                  onChange(next);
                }}
              />
            </div>
          ) : null}
        </div>
      ) : (
      <div className="line-stack__row line-stack__row--item">
        <div className="field" style={{ margin: 0, flex: 1 }}>
          <label htmlFor={`line-item-${line.id}`}>{itemLabel}</label>
          {itemOptions ? (
            <SelectMenu
              id={`line-item-${line.id}`}
              value={
                itemOptions.includes(line.itemDescription)
                  ? line.itemDescription
                  : line.itemDescription === ""
                    ? ""
                    : itemOptions.includes("Other")
                      ? "Other"
                      : itemOptions.includes("Others")
                        ? "Others"
                        : itemOptions.includes("others")
                          ? "others"
                          : ""
              }
              options={itemOptions}
              placeholder={itemPlaceholder ?? `Select ${itemLabel.toLowerCase()}`}
              onChange={(next) => {
                const copy = [...lines];
                const unit = next ? resolveUnitForItem?.(next) : undefined;
                copy[idx] = {
                  ...line,
                  itemDescription: next,
                  ...(unit ? { unit } : {}),
                };
                onChange(copy);
              }}
            />
          ) : (
            <input
              id={`line-item-${line.id}`}
              value={line.itemDescription}
              onChange={(e) => {
                const next = [...lines];
                next[idx] = { ...line, itemDescription: e.target.value };
                onChange(next);
              }}
              placeholder={itemLabel}
            />
          )}
        </div>
        {lines.length > 1 ? (
          <button
            type="button"
            className="btn btn-ghost line-stack__remove"
            aria-label="Remove line"
            onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
          >
            ✕
          </button>
        ) : null}
      </div>
      )}

      {itemOptions &&
      (line.itemDescription === "Other" ||
        line.itemDescription === "Others" ||
        line.itemDescription === "others" ||
        (line.itemDescription !== "" &&
          !itemOptions.includes(line.itemDescription))) ? (
        <div className="line-stack__row" style={{ marginTop: "0.2rem", marginBottom: "0.5rem" }}>
          <div className="field" style={{ margin: 0, flex: 1 }}>
            <label htmlFor={`line-item-custom-${line.id}`}>
              Custom Description <span style={{ color: "red" }}>*</span>
            </label>
            <input
              id={`line-item-custom-${line.id}`}
              value={
                line.itemDescription === "Other" ||
                line.itemDescription === "Others" ||
                line.itemDescription === "others"
                  ? ""
                  : line.itemDescription
              }
              onChange={(e) => {
                const next = [...lines];
                next[idx] = {
                  ...line,
                  itemDescription:
                    e.target.value ||
                    (itemOptions.includes("Other")
                      ? "Other"
                      : itemOptions.includes("Others")
                        ? "Others"
                        : "others"),
                };
                onChange(next);
              }}
              placeholder="Enter custom description"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
