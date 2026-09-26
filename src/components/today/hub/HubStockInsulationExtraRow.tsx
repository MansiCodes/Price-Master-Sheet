import type { StockInsulationExtra } from "@/components/today/today-hub-model";
import {
  insulationExtraRowConsumed,
  removeInsulationExtra,
  type SetStockInsulationExtras,
} from "@/components/today/hub/patch-insulation-extra";
import {
  HubStockInsulationExtraLayingField,
  HubStockInsulationExtraLengthField,
  HubStockInsulationExtraOtherSizeField,
  HubStockInsulationExtraOtherUnitField,
  HubStockInsulationExtraSizeField,
  HubStockInsulationExtraUnitField,
} from "@/components/today/hub/HubStockInsulationExtraFields";

function HubStockInsulationExtraRemoveIcon() {
  return (
    <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden>
      <path
        d="M4 4l8 8M12 4l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HubStockInsulationExtraTotalField({
  extra,
  rowConsumed,
  setExtras,
}: {
  extra: StockInsulationExtra;
  rowConsumed: number;
  setExtras: SetStockInsulationExtras;
}) {
  return (
    <div className="field qs-wip__ins-total-field">
      <label>Total</label>
      <div className="qs-wip__ins-total-line">
        <span className="qs-wip__ins-row-total qs-wip__calc">{rowConsumed}</span>
        <button
          type="button"
          className="qs-wip__ins-remove"
          aria-label="Remove size"
          title="Remove"
          onClick={() => removeInsulationExtra(setExtras, extra.id)}
        >
          <HubStockInsulationExtraRemoveIcon />
        </button>
      </div>
    </div>
  );
}

function HubStockInsulationExtraGrid(props: {
  extra: StockInsulationExtra;
  insSizeOpts: string[];
  setExtras: SetStockInsulationExtras;
  rowConsumed: number;
}) {
  const { extra, insSizeOpts, setExtras, rowConsumed } = props;
  return (
    <div className="qs-wip__ins-extra-grid">
      <HubStockInsulationExtraSizeField extra={extra} insSizeOpts={insSizeOpts} setExtras={setExtras} />
      {extra.size === "Other" ? (
        <HubStockInsulationExtraOtherSizeField extra={extra} setExtras={setExtras} />
      ) : null}
      <HubStockInsulationExtraLengthField extra={extra} setExtras={setExtras} />
      <HubStockInsulationExtraUnitField extra={extra} setExtras={setExtras} />
      {extra.lengthUnit === "other" ? (
        <HubStockInsulationExtraOtherUnitField extra={extra} setExtras={setExtras} />
      ) : null}
      <HubStockInsulationExtraLayingField extra={extra} setExtras={setExtras} />
      <HubStockInsulationExtraTotalField extra={extra} rowConsumed={rowConsumed} setExtras={setExtras} />
    </div>
  );
}

export function HubStockInsulationExtraRow({
  extra,
  insSizeOpts,
  setExtras,
}: {
  extra: StockInsulationExtra;
  insSizeOpts: string[];
  setExtras: SetStockInsulationExtras;
}) {
  const rowConsumed = insulationExtraRowConsumed(extra);
  return (
    <div className="qs-wip__ins-extra-line">
      <HubStockInsulationExtraGrid
        extra={extra}
        insSizeOpts={insSizeOpts}
        setExtras={setExtras}
        rowConsumed={rowConsumed}
      />
    </div>
  );
}
