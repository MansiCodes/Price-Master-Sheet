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

/** Put-ups still to take off Outer (leading carried items were taken off on an earlier save). */
export function deductiblePutupKm(meta: {
  callPutupItems?: Array<{ qty?: number | string | null }>;
  callPutupCarriedCount?: number;
}): number {
  const carried = Math.max(0, Math.floor(Number(meta.callPutupCarriedCount) || 0));
  return sessionPutupKmFromItems((meta.callPutupItems ?? []).slice(carried));
}

function isSingleQuadProcess(name: string): boolean {
  return name.trim().toLowerCase() === "single quad";
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
    callPutupCarriedCount?: number;
    /** Closing already took put-up off Outer — do not subtract the same km again. */
    outerClosingIncludesPutup?: boolean;
    closing?: Record<string, number>;
  },
): Record<string, number> {
  const hasCarried = Number(meta.callPutupCarriedCount) > 0;
  const putupKm = meta.outerClosingIncludesPutup && !hasCarried
    ? 0
    : deductiblePutupKm(meta);
  const out = formClosingByProcess(
    processNames,
    meta.opening,
    meta.production,
    putupKm,
  );
  if (meta.closing) {
    for (const proc of processNames) {
      if (!isSingleQuadProcess(proc)) continue;
      const saved = Number(qty(meta.closing, proc));
      if (Number.isFinite(saved) && proc in meta.closing) out[proc] = saved;
    }
  }
  if (meta.outerClosingIncludesPutup && !hasCarried && meta.closing) {
    const saved = Object.entries(meta.closing).find(([key]) =>
      isFormOuterProcess(key),
    );
    const savedOuter = saved ? Number(saved[1]) : NaN;
    if (Number.isFinite(savedOuter)) {
      for (const proc of processNames) {
        if (isFormOuterProcess(proc)) out[proc] = savedOuter;
      }
    }
  }
  return out;
}
