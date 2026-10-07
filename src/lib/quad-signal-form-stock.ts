/**
 * Signalling/Quad **form** stock only.
 * Closing = Opening + Production, Outer also − call put-up.
 * Do not use the WIP chain (O + P − next process) here — that belongs
 * to calculateQuadSignalWip for Insulation / Single Quad only.
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

export function formProcessClosing(
  processName: string,
  opening: number,
  production: number,
  putupKm: number,
): number {
  const o = Number(opening) || 0;
  const p = Number(production) || 0;
  const putup = isFormOuterProcess(processName) ? Number(putupKm) || 0 : 0;
  return Math.round((o + p - putup) * 1000) / 1000;
}

export function formClosingByProcess(
  processNames: readonly string[],
  opening: Record<string, number> | undefined,
  production: Record<string, number> | undefined,
  putupKm: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const proc of processNames) {
    if (proc.trim().toLowerCase() === "insulation") continue;
    out[proc] = formProcessClosing(
      proc,
      qty(opening, proc),
      qty(production, proc),
      putupKm,
    );
  }
  return out;
}

export function nextDayFormOpeningFromMeta(
  processNames: readonly string[],
  meta: {
    opening?: Record<string, number>;
    production?: Record<string, number>;
    callPutupItems?: Array<{ qty?: number | string | null }>;
  },
): Record<string, number> {
  return formClosingByProcess(
    processNames,
    meta.opening,
    meta.production,
    sessionPutupKmFromItems(meta.callPutupItems),
  );
}
