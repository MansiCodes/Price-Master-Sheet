/**
 * Quad & Signalling plant WIP / finished-stock calculation.
 * Sales qty is read from the Sales ledger (never duplicated here).
 *
 * Length factors sourced from:
 * "Size of Cable, RM & Process List" → Size of Cable (col drum length)
 * + TJ Sir confirmed 12C × 1.5 uses factor 1.010 for 1KM drums.
 */

export type {
  InsulationLengthUnit,
  LengthOption,
  ProcessQtyMap,
  QuadSignalVariantConfig,
  SharedInsulationSizeContribution,
  WipCalcInput,
  WipCalcResult,
  WipStageResult,
} from "@/lib/quad-signal-wip-types";

export {
  displayKm,
  drumLabelToLengthFactor,
  INSULATION_LENGTH_UNIT_ITEMS,
  lengthValueToFactor,
  parseDrumLengthOptions,
  parseManualLengthFactor,
} from "@/lib/quad-signal-wip-length";

export {
  getQuadFactorFromSize,
  isQuadCableName,
  isSignallingCableName,
  normalizeCableName,
  parseCoreOrQuadCount,
  resolveQuadSignalVariant,
} from "@/lib/quad-signal-wip-master";

export {
  calculateQuadSignalWip,
  calculateSharedSignallingInsulation,
  insulationConsumedFromLaying,
} from "@/lib/quad-signal-wip-calc";

export {
  normalizeMatchText,
  saleMatchesCableSize,
  sumSalesKmForSize,
} from "@/lib/quad-signal-wip-sales";
