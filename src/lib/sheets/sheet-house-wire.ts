import type { CableRate } from "./types";
import { trimCell, type SheetRow } from "./sheet-cells";

function normalizeHouseWireName(name: string): string {
  return name
    .toLowerCase()
    .replace(/as per is\s*694[:\s]*2010/gi, "")
    .replace(/flexible cable/gi, "")
    .replace(/house wire/gi, "")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function houseWireSizeKey(name: string): string {
  const n = normalizeHouseWireName(name);
  if (!n) return "";
  const core = n.match(/(\d+(?:\.\d+)?)\s*core/);
  const sqmm = n.match(/(\d+(?:\.\d+)?)\s*(?:sqmm|sq mm)/);
  const gauge = n.match(/(\d+(?:\.\d+)?)\s*(?:awg|swg)/);
  const parts: string[] = [];
  if (core) parts.push(`${core[1]}c`);
  if (sqmm) parts.push(`${sqmm[1]}sq`);
  if (!sqmm && gauge) parts.push(`${gauge[1]}g`);
  if (parts.length === 0) return n;
  return parts.join(" ");
}

function isHouseWireTitle(cell: string): boolean {
  const t = cell.replace(/\s+/g, " ").trim();
  if (t.length < 6 || t.length > 160) return false;
  if (
    /total\s+(rm|prices)|wastage|making charges|qty\s*\/\s*kg|rate\s*\/\s*kg|amount\s*\/\s*km|guarant|minimum order|^item$|^area$/i.test(
      t,
    )
  ) {
    return false;
  }
  return (
    /sq\.?\s*mm/i.test(t) ||
    /\bcores?\b/i.test(t) ||
    /house\s*wire/i.test(t) ||
    /flexible\s*cable/i.test(t)
  );
}

const HOUSE_WIRE_BAND = 9;

/**
 * House Wire tab is block-based (several products side by side).
 * Pull “TOTAL PRICES PER METER” for the title above each block.
 */
export function mapHouseWirePerMeter(
  rows: SheetRow[] | undefined | null,
): Map<string, number> {
  const out = new Map<string, number>();
  if (!rows?.length) return out;

  const titles: Array<{ row: number; band: number; name: string }> = [];
  for (let r = 0; r < rows.length; r += 1) {
    const cells = (rows[r] || []).map((cell) => trimCell(cell));
    for (let c = 0; c < cells.length; c += 1) {
      const cell = cells[c] ?? "";
      if (isHouseWireTitle(cell)) {
        titles.push({
          row: r,
          band: Math.floor(c / HOUSE_WIRE_BAND),
          name: cell.replace(/\s+/g, " ").trim(),
        });
      }
    }
  }

  for (let r = 0; r < rows.length; r += 1) {
    const cells = (rows[r] || []).map((cell) => trimCell(cell));
    for (let c = 0; c < cells.length; c += 1) {
      const cell = cells[c] ?? "";
      if (!/total prices per meter/i.test(cell)) continue;
      let value: number | null = null;
      for (let j = c + 1; j < cells.length && j <= c + 4; j += 1) {
        const raw = (cells[j] ?? "").replace(/[^0-9.\-]/g, "");
        const n = Number.parseFloat(raw);
        if (Number.isFinite(n) && n > 0) {
          value = n;
          break;
        }
      }
      if (value == null) continue;
      const band = Math.floor(c / HOUSE_WIRE_BAND);
      let title = "";
      for (let i = titles.length - 1; i >= 0; i -= 1) {
        const t = titles[i]!;
        if (t.band === band && t.row < r) {
          title = t.name;
          break;
        }
      }
      if (!title) continue;
      const key = normalizeHouseWireName(title);
      const sizeKey = houseWireSizeKey(title);
      if (key) out.set(key, value);
      if (sizeKey && sizeKey !== key) out.set(sizeKey, value);
    }
  }
  return out;
}

export function overlayHouseWirePerMeter(
  rates: CableRate[],
  perMeterByName: Map<string, number>,
): CableRate[] {
  if (perMeterByName.size === 0) return rates;
  return rates.map((row) => {
    const key = normalizeHouseWireName(row.name);
    const sizeKey = houseWireSizeKey(row.name);
    const hit =
      perMeterByName.get(key) ??
      (sizeKey ? perMeterByName.get(sizeKey) : undefined);
    if (hit == null || hit <= 0) return row;
    return { ...row, rmCostingPerMtr: hit };
  });
}
