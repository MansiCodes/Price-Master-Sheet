import { DecimalInput } from "@/components/ui/DecimalInput";
import type { StockInsulationExtra } from "@/components/today/today-hub-model";
import {
  quadCableInsulationExtraConsumed,
  removeInsulationExtra,
  type SetStockInsulationExtras,
} from "@/components/today/hub/patch-insulation-extra";
import {
  HubStockInsulationExtraLengthField,
  HubStockInsulationExtraOtherSizeField,
  HubStockInsulationExtraOtherUnitField,
  HubStockInsulationExtraSizeField,
  HubStockInsulationExtraUnitField,
} from "@/components/today/hub/HubStockInsulationExtraFields";
import { patchInsulationExtra } from "@/components/today/hub/patch-insulation-extra";

function HubStockQuadCableInsulationRemoveBtn({
  extraId,
  setExtras,
}: {
  extraId: string;
  setExtras: SetStockInsulationExtras;
}) {
  return (
    <button
      type="button"
      className="qs-wip__ins-remove"
      aria-label="Remove size"
      title="Remove"
      onClick={() => removeInsulationExtra(setExtras, extraId)}
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
  );
}

function HubStockQuadCableInsulationQuadingField({
  extra,
  setExtras,
}: {
  extra: StockInsulationExtra;
  setExtras: SetStockInsulationExtras;
}) {
  return (
    <div className="field">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label>Quading</label>
        <HubStockQuadCableInsulationRemoveBtn extraId={extra.id} setExtras={setExtras} />
      </div>
      <DecimalInput
        value={extra.layingProduced}
        onChange={(next) =>
          patchInsulationExtra(setExtras, extra.id, { layingProduced: next })
        }
        placeholder="0"
      />
    </div>
  );
}

function HubStockQuadCableInsulationExtraGrid(props: {
  extra: StockInsulationExtra;
  insSizeOpts: string[];
  setExtras: SetStockInsulationExtras;
}) {
  const { extra, insSizeOpts, setExtras } = props;
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
      <HubStockQuadCableInsulationQuadingField extra={extra} setExtras={setExtras} />
    </div>
  );
}

export function HubStockQuadCableInsulationExtraRow({
  extra,
  insSizeOpts,
  setExtras,
}: {
  extra: StockInsulationExtra;
  insSizeOpts: string[];
  setExtras: SetStockInsulationExtras;
}) {
  void quadCableInsulationExtraConsumed(extra);
  return (
    <div className="qs-wip__ins-extra-line">
      <HubStockQuadCableInsulationExtraGrid
        extra={extra}
        insSizeOpts={insSizeOpts}
        setExtras={setExtras}
      />
    </div>
  );
}
