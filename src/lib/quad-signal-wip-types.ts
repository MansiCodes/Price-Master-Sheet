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

export type SharedInsulationSizeContribution = {
  size: string;
  layingProduced: number;
  coreCount: number;
  lengthFactor: number;
  /** laying × cores × lengthFactor */
  consumed: number;
};

export type InsulationLengthUnit = "km" | "m" | "other";
