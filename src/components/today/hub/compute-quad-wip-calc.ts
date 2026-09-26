import {
  calculateQuadSignalWip,
  getQuadFactorFromSize,
  insulationConsumedFromLaying,
  isQuadCableName,
  isSignallingCableName,
  lengthValueToFactor,
  resolveQuadSignalVariant,
  type WipCalcResult,
} from "@/lib/quad-signal-wip";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";

function parseNamedNonneg(names: string[], rawMap: Record<string, string>, treatDot: boolean) {
  const out: Record<string, number> = {};
  for (const name of names) {
    const raw = rawMap[name]?.trim() ?? "";
    if (raw === "" || (treatDot && raw === ".")) { out[name] = 0; continue; }
    const n = Number(raw);
    out[name] = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  return out;
}

function quadInsulationExtrasConsumed(extras: TodayHubStockState["stockInsulationExtras"]) {
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
      consumed += insulationConsumedFromLaying({ layingProduced: lay, coreCount: 4, lengthFactor: lf });
    }
  }
  return consumed;
}

function singleQuadExtrasOutbound(
  extras: TodayHubStockState["stockSingleQuadExtras"],
  primaryLaying: number,
  primaryQuadFactor: number,
) {
  let total = primaryLaying * primaryQuadFactor;
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

function computeQuadCableOverrides(stock: TodayHubStockState, production: Record<string, number>) {
  const sqPrimaryRaw = stock.stockProcessQtys["Single Quad"]?.trim() ?? "";
  const sqPrimary = sqPrimaryRaw === "" || sqPrimaryRaw === "." ? 0 : Number(sqPrimaryRaw);
  const sqPrimaryVal = Number.isFinite(sqPrimary) && sqPrimary >= 0 ? sqPrimary : 0;
  const sqExtraProdSum = stock.stockSingleQuadExtras.reduce((sum, extra) => {
    const raw = (extra.singleQuadProd || "").trim();
    if (raw === "" || raw === ".") return sum;
    const n = Number(raw);
    return sum + (Number.isFinite(n) && n >= 0 ? n : 0);
  }, 0);
  const totalSingleQuadProd = sqPrimaryVal + sqExtraProdSum;
  const layingRaw = stock.stockProcessQtys["Laying"]?.trim() ?? "";
  const layingVal = layingRaw === "" || layingRaw === "." ? 0 : Number(layingRaw);
  const primaryLaying = Number.isFinite(layingVal) && layingVal >= 0 ? layingVal : 0;
  return {
    production: { ...production, "Single Quad": totalSingleQuadProd },
    insulationConsumedOverride: totalSingleQuadProd * 4 + quadInsulationExtrasConsumed(stock.stockInsulationExtras),
    singleQuadConsumedOverride: singleQuadExtrasOutbound(
      stock.stockSingleQuadExtras, primaryLaying, getQuadFactorFromSize(stock.resolvedQuadSizeName),
    ),
  };
}

export function computeStockWipCalc(
  isQuad: boolean,
  stock: TodayHubStockState,
  quadCableProcessFields: string[],
): WipCalcResult | null {
  if (!isQuad || stock.stockKind !== "cable" || quadCableProcessFields.length === 0) return null;
  if (stock.stockWipContextLoading) return null;
  const variant = resolveQuadSignalVariant(stock.resolvedQuadSizeName);
  if (!variant) return null;
  const production = parseNamedNonneg(quadCableProcessFields, stock.stockProcessQtys, false);
  const opening = parseNamedNonneg(quadCableProcessFields, stock.stockWipOpening, true);
  const lengthFactor =
    stock.stockLengthFactor != null && Number.isFinite(stock.stockLengthFactor)
      ? stock.stockLengthFactor
      : variant.lengthFactor;
  const over = resolveCalcOverrides(stock, production);
  return calculateQuadSignalWip({
    processes: quadCableProcessFields, opening, production: over.production,
    salesKm: stock.stockWipSalesKm, coreCount: variant.coreCount, lengthFactor,
    insulationConsumedOverride: over.insulationConsumedOverride,
    singleQuadConsumedOverride: over.singleQuadConsumedOverride,
    sizeName: stock.resolvedQuadSizeName,
  });
}

function resolveCalcOverrides(stock: TodayHubStockState, production: Record<string, number>) {
  if (isSignallingCableName(stock.resolvedQuadCableName)) {
    return { production, insulationConsumedOverride: undefined, singleQuadConsumedOverride: undefined };
  }
  if (isQuadCableName(stock.resolvedQuadCableName)) return computeQuadCableOverrides(stock, production);
  return { production, insulationConsumedOverride: undefined, singleQuadConsumedOverride: undefined };
}
