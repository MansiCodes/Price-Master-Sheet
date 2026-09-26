import type { InsulationLengthUnit, LengthOption } from "@/lib/quad-signal-wip-types";

export function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

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

/** Display rounding used on plant WhatsApp reports (e.g. 93.52 → 94). */
export function displayKm(n: number): number {
  return Math.round(n);
}
