import { getQuadFactorFromSize } from "@/lib/quad-signal-wip";
import type { StockSingleQuadExtra } from "@/components/today/today-hub-model";
import type { WipCalcResult } from "@/lib/quad-signal-wip";

export function parseNonNeg(raw: string) {
  const n = raw === "" || raw === "." ? 0 : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function quadCableStages(stockWipCalc: WipCalcResult | null, quadCableProcessFields: string[]) {
  return {
    insStage: stockWipCalc?.stages.find((s) => s.process.toLowerCase() === "insulation"),
    singleQuadStage: stockWipCalc?.stages.find((s) => s.process.toLowerCase() === "single quad"),
    quadOtherProcesses: quadCableProcessFields.filter(
      (p) =>
        p.toLowerCase() !== "insulation" &&
        p.toLowerCase() !== "single quad",
    ),
  };
}

export function computeQuadCableWipDerived(
  stockWipCalc: WipCalcResult | null,
  quadCableProcessFields: string[],
  stockProcessQtys: Record<string, string>,
  stockSingleQuadExtras: StockSingleQuadExtra[],
  resolvedQuadSizeName: string,
) {
  const stages = quadCableStages(stockWipCalc, quadCableProcessFields);
  const primaryQuadFactor = getQuadFactorFromSize(resolvedQuadSizeName);
  const primaryLaying = parseNonNeg(stockProcessQtys["Laying"]?.trim() ?? "");
  const primarySqProd = parseNonNeg(stockProcessQtys["Single Quad"]?.trim() ?? "");
  const sqExtraSum = stockSingleQuadExtras.reduce(
    (sum, extra) => sum + parseNonNeg((extra.singleQuadProd || "").trim()),
    0,
  );
  const extraLayingSum = stockSingleQuadExtras.reduce(
    (sum, extra) => sum + parseNonNeg((extra.layingProduced || "").trim()),
    0,
  );
  return {
    ...stages,
    primaryQuadFactor,
    primaryLaying,
    primaryRowOutbound: Math.round(primaryLaying * primaryQuadFactor * 10000) / 10000,
    totalSingleQuadProd: primarySqProd + sqExtraSum,
    totalLayingProduced: primaryLaying + extraLayingSum,
  };
}
