/**
 * Signalling/Quad form + production-status remaining.
 * Size processes: Closing = Opening + Production − next process Production
 * (DST Out = Outer production). Outer also − call put-up.
 * Insulation is not part of this map.
 */

export function isFormOuterProcess(name: string): boolean {
  const n = String(name ?? "")
    .trim()
    .toLowerCase();
  return n === "outer" || n === "outer sheath";
}

export function sessionPutupKmFromItems(
  items: Array<{ qty?: number | string | null }> | undefined,
): number {
  const sum = (items ?? []).reduce((s, item) => {
    const q = Number(item.qty);
    return s + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);
  return Math.round(sum * 1000) / 1000;
}

function qty(map: Record<string, number> | undefined, proc: string): number {
  if (!map) return 0;
  const want = proc.trim().toLowerCase();
  const aliases =
    want === "outer" || want === "outer sheath"
      ? ["outer sheath", "outer"]
      : want === "inner" || want === "inner sheath"
        ? ["inner sheath", "inner"]
        : [want];
  for (const alias of aliases) {
    for (const [key, raw] of Object.entries(map)) {
      if (key.trim().toLowerCase() !== alias) continue;
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function nextSizeProcess(
  processNames: readonly string[],
  index: number,
): string | undefined {
  for (let j = index + 1; j < processNames.length; j++) {
    if (processNames[j]!.trim().toLowerCase() === "insulation") continue;
    return processNames[j];
  }
  return undefined;
}

export function formProcessClosing(
  processName: string,
  opening: number,
  production: number,
  putupKm: number,
  nextProduction = 0,
): number {
  const o = Number(opening) || 0;
  const p = Number(production) || 0;
  if (isFormOuterProcess(processName)) {
    const putup = Number(putupKm) || 0;
    return Math.round((o + p - putup) * 1000) / 1000;
  }
  const next = Number(nextProduction) || 0;
  return Math.round((o + p - next) * 1000) / 1000;
}

export function formClosingByProcess(
  processNames: readonly string[],
  opening: Record<string, number> | undefined,
  production: Record<string, number> | undefined,
  putupKm: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (let i = 0; i < processNames.length; i++) {
    const proc = processNames[i]!;
    if (proc.trim().toLowerCase() === "insulation") continue;
    const next = nextSizeProcess(processNames, i);
    out[proc] = formProcessClosing(
      proc,
      qty(opening, proc),
      qty(production, proc),
      putupKm,
      next ? qty(production, next) : 0,
    );
  }
  return out;
}

/** Tomorrow's Opening = yesterday remaining (chain + Outer after put-up). */
export function nextDayFormOpeningFromMeta(
  processNames: readonly string[],
  meta: {
    opening?: Record<string, number>;
    production?: Record<string, number>;
    callPutupItems?: Array<{ qty?: number | string | null }>;
    /** Closing already took put-up off Outer — do not subtract the same km again. */
    outerClosingIncludesPutup?: boolean;
  },
): Record<string, number> {
  const putupKm = meta.outerClosingIncludesPutup
    ? 0
    : sessionPutupKmFromItems(meta.callPutupItems);
  return formClosingByProcess(
    processNames,
    meta.opening,
    meta.production,
    putupKm,
  );
}
