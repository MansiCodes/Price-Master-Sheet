import {
  calculateQuadSignalWip,
  calculateSharedSignallingInsulation,
  getQuadFactorFromSize,
  insulationConsumedFromLaying,
  isQuadCableName,
  isSignallingCableName,
  lengthValueToFactor,
  resolveQuadSignalVariant,
  type WipCalcResult,
} from "@/lib/quad-signal-wip";
import { insulationExtraRowConsumed } from "@/components/today/hub/patch-insulation-extra";
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

type SignallingInsulStock = Pick<
  TodayHubStockState,
  | "resolvedQuadSizeName"
  | "stockLengthFactor"
  | "stockInsulationExtras"
  | "resolvedQuadCableName"
  | "stockCable"
>;

function extraLayQty(extra: TodayHubStockState["stockInsulationExtras"][number]) {
  const raw = extra.layingProduced.trim();
  const lay = raw === "" || raw === "." ? 0 : Number(raw);
  return Number.isFinite(lay) && lay >= 0 ? lay : 0;
}

function signallingDrumFactor(
  stock: SignallingInsulStock,
  fallback: number,
) {
  const lf = stock.stockLengthFactor;
  return lf != null && Number.isFinite(lf) && lf > 0 ? lf : fallback;
}

/**
 * Signalling mapping (keep these in lockstep):
 * - Insulation Out / Closing = sum of + extra Totals only
 * - Laying → Outer Sheath Production = that size only (does not change Insulation Out)
 * - Extra row Total = same laying × cores × length as that slice of Out
 * - Save sharedInsulation.consumed/closing = the same Out / Closing
 * - Next day's Opening / Stock card = last Insulation P>0 or extra-Out save
 */
export function signallingInsulationPool(
  stock: SignallingInsulStock,
  _production: Record<string, number>,
) {
  const variant = resolveQuadSignalVariant(stock.resolvedQuadSizeName);
  const drum = signallingDrumFactor(stock, variant?.lengthFactor ?? 1);
  const sizes: Array<{
    size: string;
    layingProduced: number;
    coreCount: number;
    lengthFactor: number;
  }> = [];
  for (const extra of stock.stockInsulationExtras) {
    const sizeName = extra.size === "Other" ? extra.sizeOther.trim() : extra.size.trim();
    if (!sizeName) continue;
    const ev = resolveQuadSignalVariant(sizeName);
    if (!ev) continue;
    const parsed = lengthValueToFactor(extra.lengthValue, extra.lengthUnit);
    const lengthFactor = parsed != null && parsed > 0 ? parsed : drum;
    sizes.push({
      size: sizeName,
      layingProduced: extraLayQty(extra),
      coreCount: ev.coreCount,
      lengthFactor,
    });
  }
  return calculateSharedSignallingInsulation({
    opening: 0,
    production: 0,
    sizes,
  });
}

export function signallingInsulationConsumed(
  stock: SignallingInsulStock,
  production: Record<string, number>,
) {
  const variant = resolveQuadSignalVariant(stock.resolvedQuadSizeName);
  const drum = signallingDrumFactor(stock, variant?.lengthFactor ?? 1);
  return stock.stockInsulationExtras.reduce(
    (sum, extra) => sum + insulationExtraRowConsumed(extra, drum),
    0,
  );
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
  const cableName = stock.resolvedQuadCableName || stock.stockCable;
  if (isSignallingCableName(cableName)) {
    return {
      production,
      insulationConsumedOverride: signallingInsulationConsumed(stock, production),
      singleQuadConsumedOverride: undefined,
    };
  }
  if (isQuadCableName(stock.resolvedQuadCableName)) return computeQuadCableOverrides(stock, production);
  return { production, insulationConsumedOverride: undefined, singleQuadConsumedOverride: undefined };
}
