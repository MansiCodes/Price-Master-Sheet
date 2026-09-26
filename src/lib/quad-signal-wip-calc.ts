import { getQuadFactorFromSize } from "@/lib/quad-signal-wip-master";
import { round4 } from "@/lib/quad-signal-wip-length";
import type {
  ProcessQtyMap,
  SharedInsulationSizeContribution,
  WipCalcInput,
  WipCalcResult,
  WipStageResult,
} from "@/lib/quad-signal-wip-types";

function num(map: ProcessQtyMap, key: string): number {
  const v = map[key];
  if (v == null || v === ("" as unknown as number)) return 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Insulation wire km consumed by laying (existing plant formula).
 * consumed = layingProduced × coreCount × lengthFactor
 */
export function insulationConsumedFromLaying(params: {
  layingProduced: number;
  coreCount: number;
  lengthFactor: number;
}): number {
  const laying = Number(params.layingProduced);
  const cores = Number(params.coreCount);
  const factor = Number(params.lengthFactor);
  if (
    !Number.isFinite(laying) ||
    !Number.isFinite(cores) ||
    !Number.isFinite(factor) ||
    laying < 0 ||
    cores <= 0 ||
    factor <= 0
  ) {
    return 0;
  }
  return round4(laying * cores * factor);
}

/**
 * Signalling Cable: Insulation is one common pool across sizes.
 * Deduction = Σ (laying_s × cores_s × factor_s) — same formula as single-size WIP.
 */
export function calculateSharedSignallingInsulation(params: {
  opening: number;
  production: number;
  sizes: Array<{
    size: string;
    layingProduced: number;
    coreCount: number;
    lengthFactor: number;
  }>;
}): {
  opening: number;
  production: number;
  consumed: number;
  closing: number;
  contributions: SharedInsulationSizeContribution[];
  warnings: string[];
} {
  const opening = Math.max(0, Number(params.opening) || 0);
  const production = Math.max(0, Number(params.production) || 0);
  const contributions: SharedInsulationSizeContribution[] = params.sizes.map(
    (s) => {
      const consumed = insulationConsumedFromLaying({
        layingProduced: s.layingProduced,
        coreCount: s.coreCount,
        lengthFactor: s.lengthFactor,
      });
      return {
        size: s.size,
        layingProduced: Number(s.layingProduced) || 0,
        coreCount: s.coreCount,
        lengthFactor: s.lengthFactor,
        consumed,
      };
    },
  );
  const consumed = round4(
    contributions.reduce((sum, c) => sum + c.consumed, 0),
  );
  const available = opening + production;
  const warnings: string[] = [];
  if (consumed > available + 1e-9) {
    warnings.push(
      `Insulation: outbound ${consumed} exceeds available ${round4(available)}.`,
    );
  }
  return {
    opening,
    production,
    consumed,
    closing: round4(opening + production - consumed),
    contributions,
    warnings,
  };
}

/**
 * Ordered process chain WIP.
 * Intermediate: close = open + prod − nextProd
 * Insulation→Laying / Single Quad: consumed = laying × cores × lengthFactor or single quad × 4
 * Final stage: close = open + prod − salesKm
 */
export function calculateQuadSignalWip(input: WipCalcInput & {
  singleQuadConsumedOverride?: number;
  sizeName?: string;
}): WipCalcResult {
  const {
    processes,
    opening,
    production,
    salesKm,
    coreCount,
    lengthFactor,
    insulationConsumedOverride,
    singleQuadConsumedOverride,
    sizeName = "",
  } = input;
  const warnings: string[] = [];
  const stages: WipStageResult[] = [];
  const byProcess: ProcessQtyMap = {};

  if (processes.length === 0) {
    return {
      stages: [],
      byProcess: {},
      insulationConsumed: 0,
      salesKm,
      finishedProcess: null,
      warnings: ["No process chain configured."],
      calcSnapshot: {
        coreCount,
        lengthFactor,
        layingProduced: 0,
        insulationConsumed: 0,
        salesKm,
      },
    };
  }

  const finishedProcess = processes[processes.length - 1]!;
  const layingIdx = processes.findIndex((p) => {
    const n = p.toLowerCase();
    return n === "laying" || n.startsWith("laying ");
  });
  const singleQuadIdx = processes.findIndex(
    (p) => p.toLowerCase() === "single quad",
  );
  const insulationIdx = processes.findIndex(
    (p) => p.toLowerCase() === "insulation",
  );

  const layingProduced =
    layingIdx >= 0 ? num(production, processes[layingIdx]!) : 0;
  const singleQuadProduced =
    singleQuadIdx >= 0 ? num(production, processes[singleQuadIdx]!) : 0;

  // Single Quad calculation
  const quadFactor = sizeName
    ? getQuadFactorFromSize(sizeName)
    : coreCount >= 4
      ? coreCount / 4
      : 6;

  const singleQuadConsumedFromPrimary =
    singleQuadIdx >= 0 && layingIdx >= 0
      ? round4(layingProduced * quadFactor)
      : 0;
  const singleQuadConsumed =
    singleQuadConsumedOverride != null &&
    Number.isFinite(singleQuadConsumedOverride) &&
    singleQuadConsumedOverride >= 0
      ? round4(singleQuadConsumedOverride)
      : singleQuadConsumedFromPrimary;

  // Insulation calculation
  const insulationConsumedFromPrimary =
    insulationIdx >= 0
      ? singleQuadIdx >= 0
        ? round4(singleQuadProduced * 4) // 1 Single Quad = 4 insulation wires
        : layingIdx >= 0
          ? insulationConsumedFromLaying({
              layingProduced,
              coreCount,
              lengthFactor,
            })
          : 0
      : 0;

  const insulationConsumed =
    insulationConsumedOverride != null &&
    Number.isFinite(insulationConsumedOverride) &&
    insulationConsumedOverride >= 0
      ? round4(insulationConsumedOverride)
      : insulationConsumedFromPrimary;

  for (let i = 0; i < processes.length; i++) {
    const process = processes[i]!;
    const open = num(opening, process);
    const prod = num(production, process);
    const isFinished = i === processes.length - 1;
    const isInsulation = insulationIdx === i;
    const isSingleQuad = singleQuadIdx === i;

    let outbound = 0;
    let outboundKind: WipStageResult["outboundKind"] = "none";

    if (isInsulation && (layingIdx > insulationIdx || singleQuadIdx > insulationIdx)) {
      outbound = insulationConsumed;
      outboundKind = "insulation_to_laying";
    } else if (isSingleQuad && layingIdx > singleQuadIdx) {
      outbound = singleQuadConsumed;
      outboundKind = "next_process";
    } else if (isFinished) {
      outbound = salesKm > 0 ? salesKm : 0;
      outboundKind = salesKm > 0 ? "sales" : "none";
    } else {
      const next = processes[i + 1]!;
      outbound = num(production, next);
      outboundKind = "next_process";
    }

    const available = open + prod;
    if (outbound > available + 1e-9) {
      warnings.push(
        `${process}: outbound ${outbound} exceeds available ${round4(available)}.`,
      );
    }

    const closing = round4(open + prod - outbound);
    stages.push({
      process,
      opening: open,
      production: prod,
      outbound,
      outboundKind,
      closing,
    });
    byProcess[process] = closing;
  }

  return {
    stages,
    byProcess,
    insulationConsumed,
    salesKm,
    finishedProcess,
    warnings,
    calcSnapshot: {
      coreCount,
      lengthFactor,
      layingProduced,
      insulationConsumed,
      salesKm,
    },
  };
}
