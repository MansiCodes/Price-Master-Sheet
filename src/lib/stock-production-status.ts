import {
  getQuadSignalCableProcesses,
  parseQuadSignalStockNotes,
  quadSignalClosingFromMeta,
} from "@/lib/plant-catalogs";
import { toIsoDateString } from "@/lib/dates";
import { isSignallingCableName } from "@/lib/quad-signal-wip";

export type StockProcessLine = {
  name: string;
  shortName: string;
  closing: number;
  production: number;
};

export type CableStockStatusBlock = {
  key: string;
  cable: string;
  size: string;
  entryDate: string;
  processes: StockProcessLine[];
  totalKm: number;
  salesKm: number;
  /** Put-up km (parsed from Call putup). Subtracted from Outer for display/total. */
  putupKm: number;
  callPutup: string;
  putupDate: string;
  partyName: string;
  dispatchPending: number;
  userNotes: string;
};

/** Signalling shared Insulation pool (one card for all sizes). */
export type SharedInsulationStatus = {
  entryDate: string;
  opening: number;
  production: number;
  consumed: number;
  closing: number;
};

function shortProcessName(name: string): string {
  const n = name.trim().toLowerCase();
  if (n === "conductor") return "Conductor";
  if (n === "insulation") return "Insul";
  if (n === "laying") return "Laying";
  if (n === "inner sheath") return "Inner";
  if (n === "outer sheath") return "Outer";
  if (n === "single quad") return "Single Quad";
  if (n === "intermediate sheath") return "Inter";
  if (n === "screening") return "Screening";
  if (n === "dst") return "DST";
  if (n === "armouring" || n === "armoring") return "Armed";
  return name;
}

function fmtKm(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * 1000) / 1000;
  return Number.isInteger(r) ? String(r) : String(r);
}

export function formatProcessStatusLine(line: StockProcessLine): string {
  return `${line.shortName}: ${fmtKm(line.closing)}km(${fmtKm(line.production)}km)`;
}

export function formatCallPutupLine(block: CableStockStatusBlock): string | null {
  const callPutup = (block.callPutup ?? "").trim();
  const putupDate = (block.putupDate ?? "").trim();
  const partyName = (block.partyName ?? "").trim();
  const putupKm = Number(block.putupKm) || 0;
  const hasKm = putupKm > 0;
  const hasText = Boolean(callPutup);
  const hasDate = Boolean(putupDate);
  const hasParty = Boolean(partyName);
  if (!hasKm && !hasText && !hasDate && !hasParty) return null;

  const kmPart = hasKm
    ? `${fmtKm(putupKm)}km`
    : hasText
      ? callPutup
      : "—";
  const datePart = hasDate ? ` dated on ${putupDate}` : "";
  const partyPart = hasParty ? ` (${partyName})` : "";
  return `Call putup: ${kmPart}${datePart}${partyPart}`;
}

export function formatDispatchLine(block: CableStockStatusBlock): string | null {
  const partyName = (block.partyName ?? "").trim();
  const hasParty = Boolean(partyName);
  const qtyRaw = Number(block.dispatchPending);
  const qty = Number.isFinite(qtyRaw) ? Math.max(0, qtyRaw) : 0;
  // Show when party or qty is present (always print qty, including 0).
  if (!hasParty && qty <= 0) return null;
  const party = hasParty ? partyName : "—";
  return `Dispatch: ${fmtKm(qty)}km (${party})`;
}

/** Parse a put-up km value from Call putup text (e.g. "5", "5km", "5 km"). */
function parsePutupKm(raw: string | undefined | null): number {
  const s = (raw ?? "")
    .trim()
    .replace(/\s*km\s*$/i, "")
    .trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function isOuterProcess(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === "outer sheath" || n === "outer";
}

export function formatSharedInsulationLine(
  status: SharedInsulationStatus,
): string {
  return `Insul: ${fmtKm(status.closing)}km(${fmtKm(status.production)}km)`;
}

/**
 * Build cable-size production status blocks from QSSTOCK FG rows.
 * Keeps the newest entry per cable · size (rows should be newest-first).
 * Signalling Insulation is returned separately (shared across sizes).
 */
export function buildCableStockStatus(rows: Array<{
  id: string;
  date: Date;
  itemName: string;
  notes: string | null;
}>): {
  blocks: CableStockStatusBlock[];
  sharedInsulation: SharedInsulationStatus | null;
} {
  const byKey = new Map<string, CableStockStatusBlock>();
  let sharedInsulation: SharedInsulationStatus | null = null;

  for (const row of rows) {
    const { meta, userNotes } = parseQuadSignalStockNotes(row.notes);
    if (!meta || meta.kind !== "cable") continue;
    const cable = (meta.cable ?? "").trim();
    const size = (meta.size ?? "").trim();
    if (!cable || !size) continue;

    if (!sharedInsulation && isSignallingCableName(cable)) {
      const entryDate = toIsoDateString(row.date);
      if (
        meta.sharedInsulation &&
        Number.isFinite(meta.sharedInsulation.closing)
      ) {
        sharedInsulation = {
          entryDate,
          opening: Number(meta.opening?.Insulation) || 0,
          production: Number(meta.production?.Insulation) || 0,
          consumed: Number(meta.sharedInsulation.consumed) || 0,
          closing: Number(meta.sharedInsulation.closing) || 0,
        };
      } else {
        const closingMap = quadSignalClosingFromMeta(meta);
        const insulClose = Number(closingMap.Insulation);
        const insulProd = Number(meta.production?.Insulation) || 0;
        if (Number.isFinite(insulClose) || insulProd) {
          sharedInsulation = {
            entryDate,
            opening: Number(meta.opening?.Insulation) || 0,
            production: insulProd,
            consumed: 0,
            closing: Number.isFinite(insulClose) ? insulClose : 0,
          };
        }
      }
    }

    const key = `${cable} · ${size}`;
    if (byKey.has(key)) continue;

    const procs = [...getQuadSignalCableProcesses(cable)];
    const production = meta.production ?? {};
    const closing = quadSignalClosingFromMeta(meta);
    let names =
      procs.length > 0
        ? procs
        : Array.from(
            new Set([...Object.keys(closing), ...Object.keys(production)]),
          );

    // Signalling Insulation lives in the shared top card, not per-size.
    if (isSignallingCableName(cable)) {
      names = names.filter((n) => n.trim().toLowerCase() !== "insulation");
    }

    const putupKm = parsePutupKm(meta.callPutup);
    const callPutup = (meta.callPutup ?? "").trim();
    const putupDate = (meta.putupDate ?? "").trim();
    const partyName = (meta.partyName ?? "").trim();
    const dispatchPending = Number(meta.dispatchPending);
    const dispatchQty =
      Number.isFinite(dispatchPending) && dispatchPending > 0
        ? dispatchPending
        : 0;

    const processes: StockProcessLine[] = names.map((name) => {
      let closingQty = Number(closing[name]) || 0;
      // Outer = Outer − put up (for card display + Total).
      if (putupKm > 0 && isOuterProcess(name)) {
        closingQty = Math.max(0, closingQty - putupKm);
      }
      return {
        name,
        shortName: shortProcessName(name),
        closing: Math.round(closingQty * 1000) / 1000,
        production: Number(production[name]) || 0,
      };
    });

    // Insul + Single Quad stay visible on the card but are not part of Total.
    // Outer already reflects put-up deduction above.
    const totalKm = processes.reduce((s, p) => {
      const n = p.name.trim().toLowerCase();
      if (n === "insulation" || n === "single quad") return s;
      return s + p.closing;
    }, 0);

    byKey.set(key, {
      key,
      cable,
      size,
      entryDate: toIsoDateString(row.date),
      processes,
      totalKm: Math.round(totalKm * 1000) / 1000,
      salesKm: Number(meta.salesKm) || 0,
      putupKm: Math.round(putupKm * 1000) / 1000,
      callPutup,
      putupDate,
      partyName,
      dispatchPending: Math.round(dispatchQty * 1000) / 1000,
      userNotes: userNotes.trim(),
    });
  }

  return {
    blocks: Array.from(byKey.values()),
    sharedInsulation,
  };
}

export type RawMaterialStockRow = {
  item: string;
  qty: number | null;
  unit: string | null;
  rate: number | null;
  value: number | null;
  entryDate: string | null;
  hasData: boolean;
};

/**
 * Build Raw Materials status rows from catalog + newest RM stock entry per item.
 * Rows should be newest-first. Catalog order is preserved; caller may re-sort.
 */
export function buildRawMaterialStockStatus(
  catalog: readonly string[],
  rows: Array<{
    itemName: string;
    date: Date;
    quantity: number | { toString(): string };
    unit: string;
    rate: number | { toString(): string };
    notes: string | null;
  }>,
): RawMaterialStockRow[] {
  const latest = new Map<
    string,
    {
      qty: number;
      unit: string;
      rate: number;
      entryDate: string;
    }
  >();

  for (const row of rows) {
    const { meta } = parseQuadSignalStockNotes(row.notes);
    if (meta && meta.kind !== "raw") continue;
    const item = row.itemName.trim();
    if (!item || latest.has(item)) continue;
    const qty = Number(row.quantity);
    const rate = Number(row.rate);
    latest.set(item, {
      qty: Number.isFinite(qty) ? qty : 0,
      unit: row.unit || "KGS",
      rate: Number.isFinite(rate) ? rate : 0,
      entryDate: toIsoDateString(row.date),
    });
  }

  const catalogSet = new Set(catalog.filter((c) => c !== "Other"));
  const out: RawMaterialStockRow[] = [];

  for (const item of catalog) {
    if (item === "Other") continue;
    const hit = latest.get(item);
    if (hit) {
      out.push({
        item,
        qty: hit.qty,
        unit: hit.unit,
        rate: hit.rate,
        value: Math.round(hit.qty * hit.rate * 10000) / 10000,
        entryDate: hit.entryDate,
        hasData: true,
      });
      latest.delete(item);
    } else {
      out.push({
        item,
        qty: null,
        unit: null,
        rate: null,
        value: null,
        entryDate: null,
        hasData: false,
      });
    }
  }

  // Any RM entries not in catalog (e.g. custom Other names) — with data first.
  for (const [item, hit] of latest) {
    if (catalogSet.has(item)) continue;
    out.push({
      item,
      qty: hit.qty,
      unit: hit.unit,
      rate: hit.rate,
      value: Math.round(hit.qty * hit.rate * 10000) / 10000,
      entryDate: hit.entryDate,
      hasData: true,
    });
  }

  out.sort((a, b) => {
    if (a.hasData !== b.hasData) return a.hasData ? -1 : 1;
    return 0;
  });

  return out;
}
