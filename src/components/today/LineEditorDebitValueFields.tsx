import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { patchLine, type LineEditorFieldProps } from "./line-editor-field-types";

export function LineEditorDebitValueFields({
  line,
  idx,
  lines,
  onChange,
  unitOptions,
  showGst,
  rateLabel,
}: LineEditorFieldProps) {
  return (
    <>
      <div className="line-stack__row line-stack__row--meta has-unit cols-3">
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
                patchLine(lines, idx, line, onChange, { unit });
              }}
            />
          </div>
        ) : null}
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor={`line-qty-${line.id}`}>Qty</label>
          <DecimalInput
            id={`line-qty-${line.id}`}
            value={line.quantity}
            onChange={(quantity) => {
              patchLine(lines, idx, line, onChange, { quantity });
            }}
          />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor={`line-rate-${line.id}`}>{rateLabel}</label>
          <DecimalInput
            id={`line-rate-${line.id}`}
            value={line.rate}
            onChange={(rate) => {
              patchLine(lines, idx, line, onChange, { rate });
            }}
            placeholder="0"
          />
        </div>
      </div>
      <div className="line-stack__row line-stack__row--meta line-stack__row--debit-rate cols-3">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor={`line-debit-qty-${line.id}`}>Debit Qty</label>
          <DecimalInput
            id={`line-debit-qty-${line.id}`}
            value={line.debitQuantity ?? ""}
            onChange={(debitQuantity) => {
              patchLine(lines, idx, line, onChange, { debitQuantity });
            }}
          />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor={`line-debit-value-${line.id}`}>Debit Value</label>
          <input
            id={`line-debit-value-${line.id}`}
            readOnly
            value={
              Number(line.debitQuantity || 0) > 0 && Number(line.rate || 0) > 0
                ? (
                    Number(line.debitQuantity || 0) * Number(line.rate || 0)
                  ).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"
            }
          />
        </div>
      </div>
      <div className="line-stack__row line-stack__row--meta has-unit">
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor={`line-net-value-${line.id}`}>Net value</label>
          <input
            id={`line-net-value-${line.id}`}
            readOnly
            value={
              Number(line.rate || 0) > 0
                ? (
                    Math.max(
                      0,
                      Number(line.quantity || 0) -
                        Number(line.debitQuantity || 0),
                    ) * Number(line.rate || 0)
                  ).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "—"
            }
          />
        </div>
        {showGst ? (
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor={`line-gst-${line.id}`}>GST %</label>
            <DecimalInput
              id={`line-gst-${line.id}`}
              value={line.gstPercent}
              onChange={(gstPercent) => {
                patchLine(lines, idx, line, onChange, { gstPercent });
              }}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
