import {
  getQuadFactorFromSize,
  insulationConsumedFromLaying,
  isQuadCableName,
  isSignallingCableName,
  lengthValueToFactor,
  resolveQuadSignalVariant,
} from "@/lib/quad-signal-wip";
import type {
  StockInsulationExtra,
  StockSingleQuadExtra,
} from "@/components/today/today-hub-model";
import type { FailFn } from "@/components/today/hub/submit-types";

export function parseNamedQtyMap(
  names: string[],
  rawMap: Record<string, string>,
  fail: FailFn,
  label: string,
  treatDotAsZero: boolean,
): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const name of names) {
    const raw = rawMap[name]?.trim() ?? "";
    if (raw === "" || (treatDotAsZero && raw === ".")) {
      out[name] = 0;
      continue;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      fail(`${label} "${name}" must be a number ≥ 0.`);
      return null;
    }
    out[name] = n;
  }
  return out;
}

function validateOneSignallingExtra(
  extra: StockInsulationExtra,
  resolvedSize: string,
  fail: FailFn,
): boolean {
  const sizeName = extra.size === "Other" ? extra.sizeOther.trim() : extra.size.trim();
  if (!sizeName) {
    fail("Select a size for each extra Insulation row.");
    return false;
  }
  if (sizeName === resolvedSize) {
    fail("Extra Insulation size must differ from the primary size.");
    return false;
  }
  if (!resolveQuadSignalVariant(sizeName)) {
    fail(`Could not resolve core count for ${sizeName}.`);
    return false;
  }
  if (lengthValueToFactor(extra.lengthValue, extra.lengthUnit) == null) {
    fail(`Enter length and unit (KM / Meter / Other) for ${sizeName}.`);
    return false;
  }
  if (extra.lengthUnit === "other" && !extra.lengthUnitOther.trim()) {
    fail(`Enter the other unit name for ${sizeName}.`);
    return false;
  }
  return signallingExtraLayOk(extra, sizeName, fail);
}

function signallingExtraLayOk(
  extra: StockInsulationExtra,
  sizeName: string,
  fail: FailFn,
) {
  const layRaw = extra.layingProduced.trim();
  const lay = layRaw === "" || layRaw === "." ? 0 : Number(layRaw);
  if (!Number.isFinite(lay) || lay < 0) {
    fail(`Laying production for ${sizeName} must be a number ≥ 0.`);
    return false;
  }
  return true;
}

export function validateSignallingInsulationExtras(
  extras: StockInsulationExtra[],
  resolvedSize: string,
  fail: FailFn,
): boolean {
  return extras.every((extra) => validateOneSignallingExtra(extra, resolvedSize, fail));
}

function quadInsulationExtrasConsumed(extras: StockInsulationExtra[]) {
  let consumed = 0;
  for (const extra of extras) {
    const sizeName = extra.size === "Other" ? extra.sizeOther.trim() : extra.size.trim();
    if (!sizeName) continue;
    const ev = resolveQuadSignalVariant(sizeName);
    if (!ev) continue;
    const lf = lengthValueToFactor(extra.lengthValue, extra.lengthUnit);
    if (lf == null) continue;
    const layRaw = extra.layingProduced.trim();
    const lay = layRaw === "" || layRaw === "." ? 0 : Number(layRaw);
    if (Number.isFinite(lay) && lay >= 0) {
      consumed += insulationConsumedFromLaying({
        layingProduced: lay, coreCount: 4, lengthFactor: lf,
      });
    }
  }
  return consumed;
}

function singleQuadExtrasOutbound(extras: StockSingleQuadExtra[]) {
  let total = 0;
  for (const extra of extras) {
    const sizeName = extra.size === "Other" ? extra.sizeOther.trim() : extra.size.trim();
    if (!sizeName) continue;
    const factor = getQuadFactorFromSize(sizeName);
    const layRaw = (extra.layingProduced || "").trim();
    const lay = layRaw === "" || layRaw === "." ? 0 : Number(layRaw);
    if (Number.isFinite(lay) && lay >= 0) total += lay * factor;
  }
  return total;
}

function singleQuadExtrasProdSum(extras: StockSingleQuadExtra[]) {
  return extras.reduce((sum, extra) => {
    const raw = (extra.singleQuadProd || "").trim();
    if (raw === "" || raw === ".") return sum;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return sum;
    return sum + n;
  }, 0);
}

export function applyQuadCableProcessOverrides(args: {
  resolvedCable: string;
  resolvedSize: string;
  processes: Record<string, number>;
  stockInsulationExtras: StockInsulationExtra[];
  stockSingleQuadExtras: StockSingleQuadExtra[];
  fail: FailFn;
}): { insulationConsumedOverride?: number; singleQuadConsumedOverride?: number } | null {
  const { resolvedCable, resolvedSize, processes, stockInsulationExtras, stockSingleQuadExtras, fail } = args;
  if (isSignallingCableName(resolvedCable)) {
    if (!validateSignallingInsulationExtras(stockInsulationExtras, resolvedSize, fail)) {
      return null;
    }
    return { insulationConsumedOverride: undefined };
  }
  if (!isQuadCableName(resolvedCable)) return {};
  const totalSingleQuadProd = (processes["Single Quad"] ?? 0) + singleQuadExtrasProdSum(stockSingleQuadExtras);
  processes["Single Quad"] = totalSingleQuadProd;
  const primaryLaying = processes["Laying"] ?? 0;
  const primaryQuadFactor = getQuadFactorFromSize(resolvedSize);
  return {
    insulationConsumedOverride: totalSingleQuadProd * 4 + quadInsulationExtrasConsumed(stockInsulationExtras),
    singleQuadConsumedOverride:
      primaryLaying * primaryQuadFactor + singleQuadExtrasOutbound(stockSingleQuadExtras),
  };
}
