import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { INSULATION_LENGTH_UNIT_ITEMS } from "@/lib/quad-signal-wip";
import type { StockInsulationExtra } from "@/components/today/today-hub-model";
import {
  patchInsulationExtra,
  type SetStockInsulationExtras,
} from "@/components/today/hub/patch-insulation-extra";

export function HubStockInsulationExtraSizeField({
  extra,
  insSizeOpts,
  setExtras,
}: {
  extra: StockInsulationExtra;
  insSizeOpts: string[];
  setExtras: SetStockInsulationExtras;
}) {
  return (
    <div className="field">
      <label>Cable size</label>
      <SelectMenu
        value={extra.size}
        options={insSizeOpts}
        required
        onChange={(next) => {
          patchInsulationExtra(setExtras, extra.id, (row) => ({
            size: next,
            sizeOther: next === "Other" ? row.sizeOther : "",
          }));
        }}
      />
    </div>
  );
}

export function HubStockInsulationExtraOtherSizeField({
  extra,
  setExtras,
}: {
  extra: StockInsulationExtra;
  setExtras: SetStockInsulationExtras;
}) {
  return (
    <div className="field">
      <label>Other size</label>
      <input
        required
        placeholder="Other size"
        value={extra.sizeOther}
        onChange={(e) =>
          patchInsulationExtra(setExtras, extra.id, {
            sizeOther: e.target.value,
          })
        }
      />
    </div>
  );
}

export function HubStockInsulationExtraLengthField({
  extra,
  setExtras,
}: {
  extra: StockInsulationExtra;
  setExtras: SetStockInsulationExtras;
}) {
  return (
    <div className="field">
      <label>Length</label>
      <DecimalInput
        value={extra.lengthValue}
        onChange={(next) =>
          patchInsulationExtra(setExtras, extra.id, { lengthValue: next })
        }
        placeholder="1.4"
        aria-label="Length"
      />
    </div>
  );
}

export function HubStockInsulationExtraUnitField({
  extra,
  setExtras,
}: {
  extra: StockInsulationExtra;
  setExtras: SetStockInsulationExtras;
}) {
  return (
    <div className="field qs-wip__ins-unit-field">
      <label>Unit</label>
      <SelectMenu
        value={extra.lengthUnit}
        items={[...INSULATION_LENGTH_UNIT_ITEMS]}
        required
        onChange={(next) => {
          if (next !== "km" && next !== "m" && next !== "other") return;
          patchInsulationExtra(setExtras, extra.id, (row) => ({
            lengthUnit: next,
            lengthUnitOther: next === "other" ? row.lengthUnitOther : "",
          }));
        }}
      />
    </div>
  );
}

export function HubStockInsulationExtraOtherUnitField({
  extra,
  setExtras,
}: {
  extra: StockInsulationExtra;
  setExtras: SetStockInsulationExtras;
}) {
  return (
    <div className="field">
      <label>Other unit</label>
      <input
        required
        placeholder="Enter unit"
        value={extra.lengthUnitOther}
        onChange={(e) =>
          patchInsulationExtra(setExtras, extra.id, {
            lengthUnitOther: e.target.value,
          })
        }
      />
    </div>
  );
}

export function HubStockInsulationExtraLayingField({
  extra,
  setExtras,
}: {
  extra: StockInsulationExtra;
  setExtras: SetStockInsulationExtras;
}) {
  return (
    <div className="field">
      <label>Laying</label>
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
