import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { patchLine, type LineEditorFieldProps } from "./line-editor-field-types";

export function LineEditorCompactRateFields({
  line,
  idx,
  lines,
  onChange,
  showGst,
  rateLabel,
}: LineEditorFieldProps) {
  return (
    <div
      className={`line-stack__row line-stack__row--meta${showGst ? " has-gst" : ""}`}
    >
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
  );
}

export function LineEditorStandardValueFields({
  line,
  idx,
  lines,
  onChange,
  unitOptions,
  showGst,
  rateLabel,
}: LineEditorFieldProps) {
  return (
    <div
      className={`line-stack__row line-stack__row--meta${showGst ? " has-gst" : ""}${unitOptions ? " has-unit" : ""}`}
    >
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
  );
}

export function LineEditorMeterFields({
  line,
  idx,
  lines,
  onChange,
}: Pick<LineEditorFieldProps, "line" | "idx" | "lines" | "onChange">) {
  return (
    <div className="line-stack__row line-stack__row--meta line-stack__row--meter">
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor={`line-in-meter-${line.id}`}>In Meter</label>
        <DecimalInput
          id={`line-in-meter-${line.id}`}
          value={line.inMeter ?? ""}
          onChange={(inMeter) => {
            patchLine(lines, idx, line, onChange, { inMeter });
          }}
        />
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor={`line-qty-mtr-${line.id}`}>QTY-MTR</label>
        <DecimalInput
          id={`line-qty-mtr-${line.id}`}
          value={line.qtyMtr ?? ""}
          onChange={(qtyMtr) => {
            patchLine(lines, idx, line, onChange, { qtyMtr });
          }}
        />
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor={`line-meter-unit-${line.id}`}>Unit (MTR)</label>
        <SelectMenu
          id={`line-meter-unit-${line.id}`}
          value={line.meterUnit?.trim() || "MTR"}
          options={["MTR", "FT", "—"]}
          onChange={(meterUnit) => {
            patchLine(lines, idx, line, onChange, {
              meterUnit: meterUnit === "—" ? "" : meterUnit,
            });
          }}
        />
      </div>
    </div>
  );
}
