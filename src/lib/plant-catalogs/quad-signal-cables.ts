/** Quad + Signal — Cable type dropdown. */
export const QUAD_SIGNAL_STOCK_CABLES = [
  "Signalling Cable",
  "Power Cable",
  "Indoor Multi-Core Cable",
  "Indoor Single-Core Cable",
  "Fire Survival Cable",
  "Quad Cable",
  "PIJF Cable",
  "Other",
] as const;

const SIGNALLING_CABLE_SIZES = [
  "2 Core x 2.5 sqmm",
  "6 Core x 1.5 sqmm",
  "12 Core x 1.5 sqmm",
  "18 Core x 1.5 sqmm",
  "19 Core x 1.5 sqmm",
  "24 Core x 1.5 sqmm",
  "30 Core x 1.5 sqmm",
  "12 Core x 2.5 sqmm",
  "Other",
] as const;

const POWER_CABLE_SIZES = [
  "2 Core x 10 sqmm",
  "2 Core x 25 sqmm",
  "2 Core x 35 sqmm",
  "2 Core x 70 sqmm",
  "Other",
] as const;

const INDOOR_MULTI_CORE_SIZES = [
  "40 Core x 0.6mm",
  "60 Core x 0.6mm",
  "40 Core x 1.0mm",
  "60 Core x 1.0mm",
  "24 Core x 0.6mm",
  "24 Core x 1.0mm",
  "Other",
] as const;

const INDOOR_SINGLE_CORE_SIZES = [
  "16/0.2 mm ABC",
  "16/0.2 mm ATC",
  "0.75 sqmm (24/0.2mm)",
  "1.5 sqmm (22/0.3mm)",
  "28/0.3mm",
  "2.5 sqmm (36/0.3mm)",
  "4 Sqmm",
  "6 Sqmm",
  "10 Sqmm",
  "16 Sqmm",
  "25 Sqmm",
  "35 Sqmm",
  "50 Sqmm",
  "3/0.75 mm",
  "7/0.75 mm",
  "1mm ATC",
  "0.6mm ATC",
  "16/0.2 mm Twin Twisted",
  "Other",
] as const;

const FIRE_SURVIVAL_SIZES = [
  "2 Core x 1.5 sqmm Armoured",
  "2 Core x 1.5 sqmm un-Armoured",
  "Other",
] as const;

const QUAD_CABLE_SIZES = [
  "6 Quad x 0.9mm",
  "4 Quad x 0.9mm",
  "Other",
] as const;

const PIJF_CABLE_SIZES = [
  "10P x 0.5mm Unamoured",
  "10P x 0.9mm Armoured",
  "20P x 0.9mm Unamoured",
  "20P x 0.9mm Armoured",
  "10P x 0.9mm Un-Armoured",
  "5P x 0.5mm Unamoured",
  "5P x 0.63mm Armoured",
  "5Pair x 0.63mm Armoured",
  "2P x 0.5mm Unamoured",
  "20P x 0.5mm Armoured",
  "Other",
] as const;

/** Sizes by cable type (always includes Other). */
export const QUAD_SIGNAL_CABLE_SIZES: Record<string, readonly string[]> = {
  "Signalling Cable": SIGNALLING_CABLE_SIZES,
  "Power Cable": POWER_CABLE_SIZES,
  "Indoor Multi-Core Cable": INDOOR_MULTI_CORE_SIZES,
  "Indoor Single-Core Cable": INDOOR_SINGLE_CORE_SIZES,
  "Fire Survival Cable": FIRE_SURVIVAL_SIZES,
  "Quad Cable": QUAD_CABLE_SIZES,
  "PIJF Cable": PIJF_CABLE_SIZES,
  Other: ["Other"],
};

/** Signalling: Insulation → Laying → Inner Sheath → DST → Outer Sheath (TJ Sir). */
const SIGNALLING_PROCESSES = [
  "Insulation",
  "Laying",
  "Inner Sheath",
  "DST",
  "Outer Sheath",
] as const;

/** Indoor Multi-Core (Mc): Conductor → Insulation → Laying 1st/2nd → Outer Sheath. */
const INDOOR_MULTI_CORE_PROCESSES = [
  "Conductor",
  "Insulation",
  "Laying 1st part",
  "Laying 2nd part",
  "Outer Sheath",
] as const;

/** Indoor Single-Core / Signal Core (SC): Conductor → Insulation → Coils. */
const INDOOR_SINGLE_CORE_PROCESSES = [
  "Conductor",
  "Insulation",
  "Coils",
] as const;

/** Quad: Insulation → Single Quad → Laying → Inner → Screening → Intermediate → DST → Outer (TJ Sir). */
const QUAD_PROCESSES = [
  "Insulation",
  "Single Quad",
  "Laying",
  "Inner",
  "Screening",
  "Intermediate",
  "DST",
  "Outer",
] as const;

const POWER_PROCESSES = [
  "Conductor",
  "Insulation",
  "Laying",
  "Inner Sheath",
  "Outer Sheath",
  "Armouring",
] as const;

/** Fire Survival keeps the prior chain (no Conductor stage). */
const FIRE_SURVIVAL_PROCESSES = [
  "Insulation",
  "Laying",
  "Inner Sheath",
  "Outer Sheath",
  "Armouring",
] as const;

const SINGLE_CORE_PROCESSES = [
  "Insulation",
  "Laying",
  "Outer Sheath",
] as const;

/** Manual process qty columns by cable type. */
export const QUAD_SIGNAL_CABLE_PROCESSES: Record<string, readonly string[]> = {
  "Signalling Cable": SIGNALLING_PROCESSES,
  "Power Cable": POWER_PROCESSES,
  "Indoor Multi-Core Cable": INDOOR_MULTI_CORE_PROCESSES,
  "Indoor Single-Core Cable": INDOOR_SINGLE_CORE_PROCESSES,
  "Fire Survival Cable": FIRE_SURVIVAL_PROCESSES,
  "Quad Cable": QUAD_PROCESSES,
  "PIJF Cable": QUAD_PROCESSES,
  Other: SINGLE_CORE_PROCESSES,
};

export function getQuadSignalCableSizes(cable: string): readonly string[] {
  return QUAD_SIGNAL_CABLE_SIZES[cable] ?? ["Other"];
}

export function getQuadSignalCableProcesses(cable: string): readonly string[] {
  return QUAD_SIGNAL_CABLE_PROCESSES[cable] ?? SINGLE_CORE_PROCESSES;
}
