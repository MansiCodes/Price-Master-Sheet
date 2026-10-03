export function isPowerCableName(cable: string): boolean {
  return cable.trim().toLowerCase().includes("power cable");
}

/** 1–2 digit laying factor (1–99). Empty → null. */
export function parsePowerLayingFactor(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  if (!/^\d{1,2}$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 99) return null;
  return n;
}

export function powerInsulationConsumed(laying: number, factor: number | null): number {
  const lay = Number(laying);
  const f = factor ?? 0;
  if (!Number.isFinite(lay) || lay < 0 || f <= 0) return 0;
  return Math.round(lay * f * 1000) / 1000;
}
