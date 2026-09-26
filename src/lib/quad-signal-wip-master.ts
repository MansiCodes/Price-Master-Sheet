import { parseDrumLengthOptions } from "@/lib/quad-signal-wip-length";
import type { QuadSignalVariantConfig } from "@/lib/quad-signal-wip-types";

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

function normalizeSizeKey(size: string): string {
  return size
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(\d)\s*P(?:air|airs)?\b/gi, "$1P");
}

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

export function isSignallingCableName(cable: string): boolean {
  const c = cable.trim().toLowerCase();
  return (
    c === "signalling cable" ||
    c === "signalling" ||
    c.includes("signalling cable") ||
    c.includes("signal cable")
  );
}

export function isQuadCableName(cable: string): boolean {
  const c = cable.trim().toLowerCase();
  return (
    c === "quad cable" ||
    c === "quad" ||
    c.includes("quad cable") ||
    c.includes("railway quad")
  );
}

export function normalizeCableName(cable: string): string {
  if (isQuadCableName(cable)) return "Quad Cable";
  if (isSignallingCableName(cable)) return "Signalling Cable";
  return cable.trim();
}

export function getQuadFactorFromSize(size: string): number {
  const s = size.trim();
  const quadMatch = s.match(/(\d+)\s*Quad/i);
  if (quadMatch) return Number(quadMatch[1]);
  const coreMatch = s.match(/(\d+)\s*Core/i);
  if (coreMatch) return Number(coreMatch[1]);
  return 6;
}
