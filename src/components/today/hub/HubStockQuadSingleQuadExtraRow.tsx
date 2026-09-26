import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { getQuadFactorFromSize } from "@/lib/quad-signal-wip";
import type { StockSingleQuadExtra } from "@/components/today/today-hub-model";

function patchSingleQuadExtra(
  extras: StockSingleQuadExtra[],
  extraId: string,
  patch: Partial<StockSingleQuadExtra> | ((row: StockSingleQuadExtra) => Partial<StockSingleQuadExtra>),
) {
  return extras.map((row) =>
    row.id === extraId
      ? { ...row, ...(typeof patch === "function" ? patch(row) : patch) }
      : row,
  );
}

function HubStockQuadSingleQuadExtraOtherSize({
  extra, extras, onChange,
}: {
  extra: StockSingleQuadExtra;
  extras: StockSingleQuadExtra[];
  onChange: (next: StockSingleQuadExtra[]) => void;
}) {
  if (extra.size !== "Other") return null;
  return (
    <input
      required
      placeholder="Other size"
      value={extra.sizeOther}
      onChange={(e) =>
        onChange(patchSingleQuadExtra(extras, extra.id, { sizeOther: e.target.value }))
      }
    />
  );
}

function HubStockQuadSingleQuadExtraSize({
  extra, sizeOpts, extras, onChange,
}: {
  extra: StockSingleQuadExtra;
  sizeOpts: string[];
  extras: StockSingleQuadExtra[];
  onChange: (next: StockSingleQuadExtra[]) => void;
}) {
  return (
    <td>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <SelectMenu
          value={extra.size}
          options={sizeOpts}
          required
          onChange={(next) => {
            onChange(patchSingleQuadExtra(extras, extra.id, (row) => ({
              size: next, sizeOther: next === "Other" ? row.sizeOther : "",
            })));
          }}
        />
        <HubStockQuadSingleQuadExtraOtherSize extra={extra} extras={extras} onChange={onChange} />
      </div>
    </td>
  );
}

function HubStockQuadSingleQuadExtraRemove({
  extra, extras, onChange,
}: {
  extra: StockSingleQuadExtra;
  extras: StockSingleQuadExtra[];
  onChange: (next: StockSingleQuadExtra[]) => void;
}) {
  return (
    <td style={{ textAlign: "center" }}>
      <button
        type="button"
        className="qs-wip__ins-remove"
        aria-label="Remove size"
        title="Remove size"
        onClick={() => onChange(extras.filter((row) => row.id !== extra.id))}
      >
        <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden>
          <path
            d="M4 4l8 8M12 4l-8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </td>
  );
}

function HubStockQuadSingleQuadExtraQty({
  extra, extras, field, onChange,
}: {
  extra: StockSingleQuadExtra;
  extras: StockSingleQuadExtra[];
  field: "singleQuadProd" | "layingProduced";
  onChange: (next: StockSingleQuadExtra[]) => void;
}) {
  return (
    <td>
      <DecimalInput
        value={extra[field]}
        onChange={(next) => onChange(patchSingleQuadExtra(extras, extra.id, { [field]: next }))}
        placeholder="0"
      />
    </td>
  );
}

function extraRowOutbound(extra: StockSingleQuadExtra) {
  const sizeName = extra.size === "Other" ? extra.sizeOther.trim() : extra.size.trim();
  const factor = getQuadFactorFromSize(sizeName);
  const layRaw = (extra.layingProduced || "").trim();
  const lay = layRaw === "" || layRaw === "." ? 0 : Number(layRaw);
  const layVal = Number.isFinite(lay) && lay >= 0 ? lay : 0;
  return Math.round(layVal * factor * 10000) / 10000;
}

export function HubStockQuadSingleQuadExtraRow({
  extra, extras, sizeOpts, onChange,
}: {
  extra: StockSingleQuadExtra;
  extras: StockSingleQuadExtra[];
  sizeOpts: string[];
  onChange: (next: StockSingleQuadExtra[]) => void;
}) {
  const rowOutbound = extraRowOutbound(extra);
  return (
    <tr>
      <HubStockQuadSingleQuadExtraSize extra={extra} sizeOpts={sizeOpts} extras={extras} onChange={onChange} />
      <td className="qs-wip__num">—</td>
      <HubStockQuadSingleQuadExtraQty extra={extra} extras={extras} field="singleQuadProd" onChange={onChange} />
      <HubStockQuadSingleQuadExtraQty extra={extra} extras={extras} field="layingProduced" onChange={onChange} />
      <td className="qs-wip__num qs-wip__calc">
        {rowOutbound > 0 ? `${rowOutbound} km` : "0 km"}
      </td>
      <td className="qs-wip__num qs-wip__calc">—</td>
      <HubStockQuadSingleQuadExtraRemove extra={extra} extras={extras} onChange={onChange} />
    </tr>
  );
}
