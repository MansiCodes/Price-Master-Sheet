import type { Dispatch, SetStateAction } from "react";
import type { StockInsulationExtra } from "@/components/today/today-hub-model";
import {
  insulationConsumedFromLaying,
  lengthValueToFactor,
  resolveQuadSignalVariant,
} from "@/lib/quad-signal-wip";

export type SetStockInsulationExtras = Dispatch<
  SetStateAction<StockInsulationExtra[]>
>;

export function patchInsulationExtra(
  setExtras: SetStockInsulationExtras,
  extraId: string,
  patch:
    | Partial<StockInsulationExtra>
    | ((row: StockInsulationExtra) => Partial<StockInsulationExtra>),
) {
  setExtras((prev) =>
    prev.map((row) =>
      row.id === extraId
        ? { ...row, ...(typeof patch === "function" ? patch(row) : patch) }
        : row,
    ),
  );
}

export function removeInsulationExtra(
  setExtras: SetStockInsulationExtras,
  extraId: string,
) {
  setExtras((prev) => prev.filter((row) => row.id !== extraId));
}

export function insulationExtraRowConsumed(extra: StockInsulationExtra) {
  const sizeName =
    extra.size === "Other" ? extra.sizeOther.trim() : extra.size.trim();
  const ev = sizeName ? resolveQuadSignalVariant(sizeName) : null;
  const lf = lengthValueToFactor(extra.lengthValue, extra.lengthUnit);
  const layRaw = extra.layingProduced.trim();
  const lay = layRaw === "" || layRaw === "." ? 0 : Number(layRaw);
  return ev && lf != null && Number.isFinite(lay) && lay >= 0
    ? insulationConsumedFromLaying({
        layingProduced: lay,
        coreCount: ev.coreCount,
        lengthFactor: lf,
      })
    : 0;
}

export function quadCableInsulationExtraConsumed(extra: StockInsulationExtra) {
  const lf = lengthValueToFactor(extra.lengthValue, extra.lengthUnit);
  const layRaw = extra.layingProduced.trim();
  const lay = layRaw === "" || layRaw === "." ? 0 : Number(layRaw);
  return lf != null && Number.isFinite(lay) && lay >= 0
    ? insulationConsumedFromLaying({
        layingProduced: lay,
        coreCount: 4,
        lengthFactor: lf,
      })
    : 0;
}
