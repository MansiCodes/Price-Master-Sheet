/**
 * Quad & Signalling plant WIP / finished-stock calculation.
 * Sales qty is read from the Sales ledger (never duplicated here).
 */

export type ProcessQtyMap = Record<string, number>;

export type QuadSignalVariantConfig = {
  /** Number of insulated wires/cores consumed into one laying km. */
  coreCount: number;
  /**
   * Length factor (drum length in km), e.g. 1.010 for 1010 m.
   * Confirmed vs provisional — do not invent new sizes without TJ / Excel.
   */
  lengthFactor: number;
  factorConfirmed: boolean;
};

/** Confirmed: 12C × 1.5 uses 1.010 (TJ Sir real example). */
const CONFIRMED_VARIANTS: Record<string, QuadSignalVariantConfig> = {
  "12 Core x 1.5 sqmm": {
    coreCount: 12,
    lengthFactor: 1.01,
    factorConfirmed: true,
  },
};

/**
 * Provisional factors from verbal TJ guidance only (6/12c ~1 km, 18–30c ~500 m).
 * Marked unconfirmed — replace from Excel / TJ when available.
 */
const PROVISIONAL_SIGNALLING: Record<string, Omit<QuadSignalVariantConfig, "factorConfirmed">> = {
  "2 Core x 1.5 sqmm": { coreCount: 2, lengthFactor: 1.01 },
  "2 Core x 2.5 sqmm": { coreCount: 2, lengthFactor: 1.01 },
  "6 Core x 1.5 sqmm": { coreCount: 6, lengthFactor: 1.01 },
  "18 Core x 1.5 sqmm": { coreCount: 18, lengthFactor: 0.505 },
  "19 Core x 1.5 sqmm": { coreCount: 19, lengthFactor: 0.505 },
  "24 Core x 1.5 sqmm": { coreCount: 24, lengthFactor: 0.505 },
  "30 Core x 1.5 sqmm": { coreCount: 30, lengthFactor: 0.505 },
  "12 Core x 2.5 sqmm": { coreCount: 12, lengthFactor: 1.01 },
};

function normalizeSizeKey(size: string): string {
  return size.trim().replace(/\s+/g, " ");
}

/** Parse "12 Core x 1.5 sqmm" / "6 Quad x 0.9mm" → core/quad count. */
export function parseCoreOrQuadCount(size: string): number | null {
  const s = size.trim();
  const core = s.match(/(\d+)\s*Core\b/i);
  if (core) return Number(core[1]);
  const quad = s.match(/(\d+)\s*Quad\b/i);
  if (quad) return Number(quad[1]) * 4; // 1 quad = 4 wires (NEEDS BUSINESS CONFIRMATION for insulation)
  const pair = s.match(/(\d+)\s*P\b/i);
  if (pair) return Number(pair[1]) * 2;
  return null;
}

export function resolveQuadSignalVariant(
  size: string,
): QuadSignalVariantConfig | null {
  const key = normalizeSizeKey(size);
  const confirmed = CONFIRMED_VARIANTS[key];
  if (confirmed) return confirmed;
  const provisional = PROVISIONAL_SIGNALLING[key];
  if (provisional) {
    return { ...provisional, factorConfirmed: false };
  }
  const cores = parseCoreOrQuadCount(key);
  if (cores == null || cores <= 0) return null;
  // Unknown size: cores from label, factor unknown → use 1.0 and flag unconfirmed
  return { coreCount: cores, lengthFactor: 1, factorConfirmed: false };
}

export type WipStageResult = {
  process: string;
  opening: number;
  production: number;
  /** Next-stage production, insulation special consumption, or sales km. */
  outbound: number;
  outboundKind: "next_process" | "insulation_to_laying" | "sales" | "none";
  closing: number;
};

export type WipCalcInput = {
  processes: readonly string[];
  opening: ProcessQtyMap;
  production: ProcessQtyMap;
  /** Finished-stock sales km (from Sales ledger). */
  salesKm: number;
  coreCount: number;
  lengthFactor: number;
};

export type WipCalcResult = {
  stages: WipStageResult[];
  byProcess: ProcessQtyMap;
  insulationConsumed: number;
  salesKm: number;
  finishedProcess: string | null;
  warnings: string[];
  calcSnapshot: {
    coreCount: number;
    lengthFactor: number;
    layingProduced: number;
    insulationConsumed: number;
    salesKm: number;
  };
};

function num(map: ProcessQtyMap, key: string): number {
  const v = map[key];
  return v != null && Number.isFinite(v) ? v : 0;
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/** Display rounding used on plant WhatsApp reports (e.g. 93.52 → 94). */
export function displayKm(n: number): number {
  return Math.round(n);
}

/**
 * Ordered process chain WIP.
 * Intermediate: close = open + prod − nextProd
 * Insulation→Laying: consumed = laying × cores × lengthFactor
 * Final stage: close = open + prod − salesKm
 */
export function calculateQuadSignalWip(input: WipCalcInput): WipCalcResult {
  const { processes, opening, production, salesKm, coreCount, lengthFactor } =
    input;
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
  const layingIdx = processes.findIndex(
    (p) => p.toLowerCase() === "laying",
  );
  const insulationIdx = processes.findIndex(
    (p) => p.toLowerCase() === "insulation",
  );

  const layingProduced =
    layingIdx >= 0 ? num(production, processes[layingIdx]!) : 0;
  const insulationConsumed =
    insulationIdx >= 0 && layingIdx >= 0
      ? round4(layingProduced * coreCount * lengthFactor)
      : 0;

  for (let i = 0; i < processes.length; i++) {
    const process = processes[i]!;
    const open = num(opening, process);
    const prod = num(production, process);
    const isFinished = i === processes.length - 1;
    const isInsulation =
      insulationIdx === i && layingIdx > insulationIdx;

    let outbound = 0;
    let outboundKind: WipStageResult["outboundKind"] = "none";

    if (isInsulation) {
      outbound = insulationConsumed;
      outboundKind = "insulation_to_laying";
    } else if (isFinished) {
      outbound = salesKm > 0 ? salesKm : 0;
      outboundKind = salesKm > 0 ? "sales" : "none";
    } else {
      const next = processes[i + 1]!;
      // Next process production consumes this stage 1:1 (except insulation handled above)
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

/** Normalize text for sale↔size matching (sales form unchanged). */
export function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Match a Sales ledger line to a stock cable size without changing the sales form.
 * Prefers descriptions that include core/quad count + cross-section (Excel imports).
 * Coarse catalog names like "Signalling Cable 1.5 sq mm" alone do NOT match a
 * specific core size (ambiguous) — returns false.
 */
export function saleMatchesCableSize(
  itemDescription: string,
  cable: string,
  size: string,
): boolean {
  const desc = normalizeMatchText(itemDescription);
  const sizeN = normalizeMatchText(size);
  if (!desc || !sizeN) return false;

  // Direct containment of size string
  if (desc.includes(sizeN)) return true;

  const coreM = sizeN.match(/(\d+)\s*core/);
  const quadM = sizeN.match(/(\d+)\s*quad/);
  const pairM = sizeN.match(/(\d+)\s*p\b/);
  const sqmmM = sizeN.match(/([\d.]+)\s*sq\s*mm/);
  const mmM = sizeN.match(/([\d.]+)\s*mm/);

  if (coreM) {
    const cores = coreM[1]!;
    const hasCores =
      desc.includes(`${cores} core`) ||
      desc.includes(`${cores}c `) ||
      desc.includes(`${cores}c x`) ||
      new RegExp(`${cores}\\s*c\\b`).test(desc);
    if (!hasCores) return false;
    if (sqmmM) {
      const sq = sqmmM[1]!;
      return (
        desc.includes(`${sq} sqmm`) ||
        desc.includes(`${sq} sq mm`) ||
        desc.includes(`x ${sq}`) ||
        desc.includes(`× ${sq}`)
      );
    }
    return false;
  }

  if (quadM) {
    const q = quadM[1]!;
    const hasQuad =
      desc.includes(`${q} quad`) || desc.includes(`${q}q `);
    if (!hasQuad) return false;
    if (mmM) {
      const mm = mmM[1]!;
      return desc.includes(`${mm}mm`) || desc.includes(`${mm} mm`);
    }
    return false;
  }

  if (pairM) {
    const p = pairM[1]!;
    if (!(desc.includes(`${p}p`) || desc.includes(`${p} p`))) return false;
    if (mmM) {
      const mm = mmM[1]!;
      return desc.includes(`${mm}mm`) || desc.includes(`${mm} mm`);
    }
  }

  // Cable family soft hint only — not enough alone
  void cable;
  return false;
}

export function sumSalesKmForSize(
  sales: Array<{ itemDescription: string; quantity: number | string }>,
  cable: string,
  size: string,
): number {
  let total = 0;
  for (const s of sales) {
    if (!saleMatchesCableSize(s.itemDescription, cable, size)) continue;
    const q = Number(s.quantity);
    if (Number.isFinite(q) && q > 0) total += q;
  }
  return round4(total);
}
