import { round4 } from "@/lib/quad-signal-wip-length";

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
