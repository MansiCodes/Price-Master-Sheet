/**
 * Quad & Signalling plant WIP / finished-stock calculation.
 * Sales qty is read from the Sales ledger (never duplicated here).
 *
 * Length factors sourced from:
 * "Size of Cable, RM & Process List" → Size of Cable (col drum length)
 * + TJ Sir confirmed 12C × 1.5 uses factor 1.010 for 1KM drums.
 */

export type ProcessQtyMap = Record<string, number>;

export type LengthOption = {
  /** UI label, e.g. "100 mtr", "1 KM", "500 Mtr" */
  label: string;
  /** Factor in km used in insulation consumption */
  lengthFactor: number;
};

export type QuadSignalVariantConfig = {
  /** Number of insulated wires/cores consumed into one laying km. */
  coreCount: number;
  /**
   * Default length factor in km (first / preferred option).
   * 1KM drums use 1.01 (TJ); 500 m → 0.5; 100 m coils → 0.1.
   */
  lengthFactor: number;
  /** Raw drum label from Size of Cable sheet. */
  drumLabel: string;
  /** Selectable drum/coil lengths when Excel lists more than one. */
  lengthOptions: LengthOption[];
  factorConfirmed: boolean;
  /** True when Excel lists multiple lengths (e.g. 1KM/500Mtr). */
  factorAmbiguous?: boolean;
};

/**
 * Expand Excel drum/coil text into selectable length options.
 * 1KM → 1.01 (plant practice confirmed by TJ for signalling 1KM drums).
 */
export function parseDrumLengthOptions(drumLabel: string): LengthOption[] {
  const raw = drumLabel.trim();
  if (!raw) return [{ label: "1 KM", lengthFactor: 1 }];

  const d = raw.toLowerCase().replace(/\s+/g, "");
  const options: LengthOption[] = [];
  const push = (label: string, lengthFactor: number) => {
    if (!options.some((o) => o.lengthFactor === lengthFactor)) {
      options.push({ label, lengthFactor });
    }
  };

  // Explicit multi patterns first
  if (/100\/200\/300/.test(d) || (d.includes("100") && d.includes("200") && d.includes("300"))) {
    push("100 mtr", 0.1);
    push("200 mtr", 0.2);
    push("300 mtr", 0.3);
    return options;
  }

  const has1km = /1km/.test(d);
  const has500 = /500mtr|500m\b|500/.test(d) && !/1500|2500|3500/.test(d);

  if (has1km) push("1 KM", 1.01);
  if (has500) push("500 Mtr", 0.5);

  if (options.length > 0) return options;

  if (/300mtr|300\s*m/.test(raw.toLowerCase())) push("300 mtr", 0.3);
  if (/200mtr|200\s*m/.test(raw.toLowerCase())) push("200 mtr", 0.2);
  if (/100mtr|100\s*m/.test(raw.toLowerCase())) push("100 mtr", 0.1);

  if (options.length > 0) return options;

  // Fallback: single option from the raw label
  return [{ label: raw || "Default", lengthFactor: 1 }];
}

/**
 * Parse Excel drum/coil text → default length factor (km).
 * Prefer first option from parseDrumLengthOptions.
 */
export function drumLabelToLengthFactor(drumLabel: string): {
  lengthFactor: number;
  ambiguous: boolean;
} {
  const options = parseDrumLengthOptions(drumLabel);
  return {
    lengthFactor: options[0]?.lengthFactor ?? 1,
    ambiguous: options.length > 1,
  };
}

type MasterRow = {
  size: string;
  drumLabel: string;
  coreCount: number;
};

/**
 * From Size of Cable sheet (yellow Power range rows excluded).
 * Process for App confirms Signalling / Quad stage order already in plant-catalogs.
 */
const SIZE_OF_CABLE_MASTER: MasterRow[] = [
  // Signalling
  { size: "2 Core x 2.5 sqmm", drumLabel: "1KM", coreCount: 2 },
  { size: "6 Core x 1.5 sqmm", drumLabel: "1KM", coreCount: 6 },
  { size: "12 Core x 1.5 sqmm", drumLabel: "1KM", coreCount: 12 },
  { size: "18 Core x 1.5 sqmm", drumLabel: "500 Mtr", coreCount: 18 },
  { size: "19 Core x 1.5 sqmm", drumLabel: "500 Mtr", coreCount: 19 },
  { size: "24 Core x 1.5 sqmm", drumLabel: "500 Mtr", coreCount: 24 },
  { size: "30 Core x 1.5 sqmm", drumLabel: "500 Mtr", coreCount: 30 },
  { size: "12 Core x 2.5 sqmm", drumLabel: "1KM/500Mtr", coreCount: 12 },
  // Power (non-yellow only)
  { size: "2 Core x 10 sqmm", drumLabel: "1KM", coreCount: 2 },
  { size: "2 Core x 25 sqmm", drumLabel: "1KM", coreCount: 2 },
  { size: "2 Core x 35 sqmm", drumLabel: "1KM", coreCount: 2 },
  { size: "2 Core x 70 sqmm", drumLabel: "500Mtr", coreCount: 2 },
  // Indoor Multi-Core
  { size: "40 Core x 0.6mm", drumLabel: "500mtr", coreCount: 40 },
  { size: "60 Core x 0.6mm", drumLabel: "500mtr", coreCount: 60 },
  { size: "40 Core x 1.0mm", drumLabel: "500mtr", coreCount: 40 },
  { size: "60 Core x 1.0mm", drumLabel: "500mtr", coreCount: 60 },
  { size: "24 Core x 0.6mm", drumLabel: "500mtr", coreCount: 24 },
  { size: "24 Core x 1.0mm", drumLabel: "500mtr", coreCount: 24 },
  // Indoor Single-Core (1 conductor)
  { size: "16/0.2 mm ABC", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "16/0.2 mm ATC", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "0.75 sqmm (24/0.2mm)", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "1.5 sqmm (22/0.3mm)", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "28/0.3mm", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "2.5 sqmm (36/0.3mm)", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "4 Sqmm", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "6 Sqmm", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "10 Sqmm", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "16 Sqmm", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "25 Sqmm", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "35 Sqmm", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "50 Sqmm", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "3/0.75 mm", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "7/0.75 mm", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "1mm ATC", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "0.6mm ATC", drumLabel: "100mtr Coils", coreCount: 1 },
  { size: "16/0.2 mm Twin Twisted", drumLabel: "100mtr Coils", coreCount: 1 },
  // Fire Survival
  {
    size: "2 Core x 1.5 sqmm Armoured",
    drumLabel: "100/200/300 mtr coil",
    coreCount: 2,
  },
  {
    size: "2 Core x 1.5 sqmm un-Armoured",
    drumLabel: "100/200/300 mtr coil",
    coreCount: 2,
  },
  // Quad
  { size: "6 Quad x 0.9mm", drumLabel: "1KM", coreCount: 24 }, // 6×4 wires
  { size: "4 Quad x 0.9mm", drumLabel: "1KM", coreCount: 16 },
  // PIJF
  { size: "10P x 0.5mm Unamoured", drumLabel: "1KM/500mtr", coreCount: 20 },
  { size: "10P x 0.9mm Armoured", drumLabel: "1KM/500mtr", coreCount: 20 },
  { size: "20P x 0.9mm Unamoured", drumLabel: "1KM/500mtr", coreCount: 40 },
  { size: "20P x 0.9mm Armoured", drumLabel: "1KM/500mtr", coreCount: 40 },
  { size: "10P x 0.9mm Un-Armoured", drumLabel: "1KM/500mtr", coreCount: 20 },
  { size: "5P x 0.5mm Unamoured", drumLabel: "1KM/500mtr", coreCount: 10 },
  { size: "2P x 0.5mm Unamoured", drumLabel: "1KM/500mtr", coreCount: 4 },
  { size: "20P x 0.5mm Armoured", drumLabel: "1KM/500mtr", coreCount: 40 },
  { size: "5P x 0.63mm Armoured", drumLabel: "1KM/500mtr", coreCount: 10 },
  { size: "5Pair x 0.63mm Armoured", drumLabel: "1KM/500mtr", coreCount: 10 },
  { size: "5 Pair x 0.63mm Armoured", drumLabel: "1KM/500mtr", coreCount: 10 },
];

function buildVariantMap(): Record<string, QuadSignalVariantConfig> {
  const map: Record<string, QuadSignalVariantConfig> = {};
  for (const row of SIZE_OF_CABLE_MASTER) {
    const lengthOptions = parseDrumLengthOptions(row.drumLabel);
    const lengthFactor = lengthOptions[0]?.lengthFactor ?? 1;
    const ambiguous = lengthOptions.length > 1;
    map[normalizeSizeKey(row.size)] = {
      coreCount: row.coreCount,
      lengthFactor,
      drumLabel: row.drumLabel,
      lengthOptions,
      factorConfirmed: !ambiguous,
      factorAmbiguous: ambiguous || undefined,
    };
  }
  return map;
}

const VARIANT_BY_SIZE = buildVariantMap();

function normalizeSizeKey(size: string): string {
  return size
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(\d)\s*P(?:air|airs)?\b/gi, "$1P");
}

/** Parse "12 Core x 1.5 sqmm" / "6 Quad x 0.9mm" / "5P" / "5Pair" → core/wire count. */
export function parseCoreOrQuadCount(size: string): number | null {
  const s = size.trim();
  const core = s.match(/(\d+)\s*Core\b/i);
  if (core) return Number(core[1]);
  const quad = s.match(/(\d+)\s*Quad\b/i);
  if (quad) return Number(quad[1]) * 4;
  // PIJF: 10P, 5P, 5Pair, 5 Pair, 20Pairs …
  const pair = s.match(/(\d+)\s*P(?:airs?|air)?\b/i);
  if (pair) return Number(pair[1]) * 2;
  return null;
}

export function resolveQuadSignalVariant(
  size: string,
): QuadSignalVariantConfig | null {
  const key = normalizeSizeKey(size);
  const fromMaster = VARIANT_BY_SIZE[key];
  if (fromMaster) return fromMaster;

  const cores = parseCoreOrQuadCount(key);
  if (cores == null || cores <= 0) return null;
  return {
    coreCount: cores,
    lengthFactor: 1,
    drumLabel: "unknown",
    lengthOptions: [{ label: "Default (1 KM)", lengthFactor: 1 }],
    factorConfirmed: false,
    factorAmbiguous: true,
  };
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
  /**
   * When set (Signalling multi-size), Insulation outbound uses this total
   * instead of primary-size laying × cores × factor alone.
   */
  insulationConsumedOverride?: number;
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

export type SharedInsulationSizeContribution = {
  size: string;
  layingProduced: number;
  coreCount: number;
  lengthFactor: number;
  /** laying × cores × lengthFactor */
  consumed: number;
};

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

export function isSignallingCableName(cable: string): boolean {
  return cable.trim().toLowerCase() === "signalling cable";
}

/**
 * Length value + explicit unit → insulation length factor (km).
 * Meter → ÷1000; KM / Other → as entered.
 */
export type InsulationLengthUnit = "km" | "m" | "other";

export const INSULATION_LENGTH_UNIT_ITEMS = [
  { value: "km", label: "KM" },
  { value: "m", label: "Meter" },
  { value: "other", label: "Other" },
] as const;

export function lengthValueToFactor(
  rawValue: string,
  unit: InsulationLengthUnit,
): number | null {
  const s = rawValue.trim().replace(/,/g, "");
  if (!s || s === ".") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  if (unit === "m") return round4(n / 1000);
  // KM and Other: value is used directly as the length factor
  return n;
}

/** @deprecated Prefer lengthValueToFactor with an explicit unit. */
export function parseManualLengthFactor(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/,/g, "");
  if (!s) return null;
  const mtr = s.match(/^(\d+(?:\.\d+)?)\s*(mtr|meters?|metres?|m)\s*$/i);
  if (mtr) return lengthValueToFactor(mtr[1]!, "m");
  const km = s.match(/^(\d+(?:\.\d+)?)\s*(km|kilometers?|kilometres?)?\s*$/i);
  if (km) return lengthValueToFactor(km[1]!, "km");
  return null;
}

function num(map: ProcessQtyMap, key: string): number {
  const v = map[key];
  if (v == null || v === ("" as unknown as number)) return 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
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
  const {
    processes,
    opening,
    production,
    salesKm,
    coreCount,
    lengthFactor,
    insulationConsumedOverride,
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
  // Exact "Laying" or split stages like "Laying 1st part" / "Laying 2nd part"
  const layingIdx = processes.findIndex((p) => {
    const n = p.toLowerCase();
    return n === "laying" || n.startsWith("laying ");
  });
  const insulationIdx = processes.findIndex(
    (p) => p.toLowerCase() === "insulation",
  );

  const layingProduced =
    layingIdx >= 0 ? num(production, processes[layingIdx]!) : 0;
  const insulationConsumedFromPrimary =
    insulationIdx >= 0 && layingIdx >= 0
      ? insulationConsumedFromLaying({
          layingProduced,
          coreCount,
          lengthFactor,
        })
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
