import {
  getQuadSignalCableProcesses,
  parseQuadSignalStockNotes,
  quadSignalCableSizeDedupeKey,
  quadSignalClosingFromMeta,
} from "@/lib/plant-catalogs";
import { toIsoDateString } from "@/lib/dates";
import { isQuadCableName, isSignallingCableName } from "@/lib/quad-signal-wip";

export type StockProcessLine = {
  name: string;
  shortName: string;
  closing: number;
  production: number;
};

export type CallPutupItem = {
  id?: string;
  qty: number | string;
  date?: string;
  partyName?: string;
};

export type DispatchPendingItem = {
  id?: string;
  qty: number | string;
  partyName?: string;
};

export type CableStockStatusBlock = {
  key: string;
  cable: string;
  size: string;
  entryDate: string;
  processes: StockProcessLine[];
  totalKm: number;
  salesKm: number;
  /** Put-up km total from Call putup. */
  putupKm: number;
  callPutup: string;
  putupDate: string;
  partyName: string;
  dispatchParty: string;
  dispatchPending: number;
  userNotes: string;
  callPutupItems?: Array<{
    qty: number;
    callPutup: string;
    putupDate: string;
    partyName: string;
  }>;
  dispatchPendingItems?: Array<{
    qty: number;
    dispatchParty: string;
  }>;
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

export type FormattedStatusItem = {
  label: string;
  value: string;
};

export function outerClosingAfterPutup(
  outerClosing: number,
  putupKm: number,
): number {
  const putup = Number(putupKm) || 0;
  const closing = Number(outerClosing) || 0;
  return Math.round(Math.max(0, closing - putup) * 1000) / 1000;
}

export function formatProcessStatusItem(
  line: StockProcessLine,
  opts?: { putupKm?: number },
): FormattedStatusItem {
  const base = `${fmtKm(line.closing)}km(${fmtKm(line.production)}km)`;
  const putupKm = Number(opts?.putupKm) || 0;
  if (putupKm > 0 && isOuterProcess(line.name)) {
    const after = outerClosingAfterPutup(line.closing, putupKm);
    return {
      label: `${line.shortName}:`,
      value: `${base} → after putup ${fmtKm(after)}km`,
    };
  }
  return {
    label: `${line.shortName}:`,
    value: base,
  };
}

export function formatProcessStatusLine(line: StockProcessLine): string {
  return `${line.shortName}: ${fmtKm(line.closing)}km(${fmtKm(line.production)}km)`;
}

/** Parse put-up km from Call putup text (e.g. "5", "5km"). */
export function parsePutupKm(raw: string | null | undefined): number {
  const s = String(raw ?? "")
    .trim()
    .replace(/\s*km\s*$/i, "")
    .trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function isOuterProcess(name: string): boolean {
  const n = String(name ?? "")
    .trim()
    .toLowerCase();
  return n === "outer sheath" || n === "outer";
}

export function formatCallPutupItem(
  block: Pick<
    CableStockStatusBlock,
    "putupKm" | "callPutup" | "putupDate" | "partyName"
  >,
): FormattedStatusItem | null {
  const putupKm = Number(block.putupKm) || 0;
  const callPutup = String(block.callPutup ?? "").trim();
  const putupDate = String(block.putupDate ?? "").trim();
  const partyName = String(block.partyName ?? "").trim();
  if (!putupKm && !callPutup && !putupDate && !partyName) return null;

  const kmPart = putupKm > 0 ? `${fmtKm(putupKm)}km` : callPutup || "—";
  const datePart = putupDate ? ` dated ${putupDate}` : "";
  const partyPart = partyName ? ` (${partyName})` : "";
  return {
    label: "Call putup:",
    value: `${kmPart}${datePart}${partyPart}`,
  };
}

export function formatCallPutupLine(
  block: Pick<
    CableStockStatusBlock,
    "putupKm" | "callPutup" | "putupDate" | "partyName"
  >,
): string | null {
  const item = formatCallPutupItem(block);
  return item ? `${item.label} ${item.value}` : null;
}

export type CallPutupStatusItem = {
  id: string;
  qty: number;
  callPutup: string;
  putupDate: string;
  partyName: string;
  label: string;
  value: string;
};

export type DispatchPendingStatusItem = {
  id: string;
  qty: number;
  dispatchParty: string;
  label: string;
  value: string;
};

export function formatCallPutupItemsList(
  block: CableStockStatusBlock,
): CallPutupStatusItem[] {
  if (Array.isArray(block.callPutupItems) && block.callPutupItems.length > 0) {
    return block.callPutupItems.map((item, idx) => {
      const kmPart = item.qty > 0 ? `${fmtKm(item.qty)}km` : item.callPutup || "—";
      const datePart = item.putupDate ? ` dated ${item.putupDate}` : "";
      const partyPart = item.partyName ? ` (${item.partyName})` : "";
      return {
        id: `putup-${idx}`,
        qty: item.qty,
        callPutup: item.callPutup,
        putupDate: item.putupDate,
        partyName: item.partyName,
        label: "Call putup:",
        value: `${kmPart}${datePart}${partyPart}`,
      };
    });
  }
  const single = formatCallPutupItem(block);
  if (!single) return [];
  return [
    {
      id: "putup-0",
      qty: block.putupKm,
      callPutup: block.callPutup,
      putupDate: block.putupDate,
      partyName: block.partyName,
      label: single.label,
      value: single.value,
    },
  ];
}

export function formatDispatchItem(
  block: Pick<
    CableStockStatusBlock,
    "partyName" | "dispatchParty" | "dispatchPending"
  >,
): FormattedStatusItem | null {
  const partyName = String(
    block.dispatchParty?.trim() || block.partyName?.trim() || "",
  ).trim();
  const qtyRaw = Number(block.dispatchPending);
  const qty = Number.isFinite(qtyRaw) ? Math.max(0, qtyRaw) : 0;
  if (!partyName && qty <= 0) return null;
  const party = partyName || "—";
  return {
    label: "Dispatch:",
    value: `${party} — ${fmtKm(qty)}km`,
  };
}

export function formatDispatchLine(
  block: Pick<
    CableStockStatusBlock,
    "partyName" | "dispatchParty" | "dispatchPending"
  >,
): string | null {
  const item = formatDispatchItem(block);
  return item ? `${item.label} ${item.value}` : null;
}

export function formatDispatchItemsList(
  block: CableStockStatusBlock,
): DispatchPendingStatusItem[] {
  if (Array.isArray(block.dispatchPendingItems) && block.dispatchPendingItems.length > 0) {
    return block.dispatchPendingItems.map((item, idx) => {
      const party = item.dispatchParty || "—";
      return {
        id: `dispatch-${idx}`,
        qty: item.qty,
        dispatchParty: item.dispatchParty,
        label: "Dispatch:",
        value: `${party} — ${fmtKm(item.qty)}km`,
      };
    });
  }
  const single = formatDispatchItem(block);
  if (!single) return [];
  return [
    {
      id: "dispatch-0",
      qty: block.dispatchPending,
      dispatchParty: block.dispatchParty || block.partyName,
      label: single.label,
      value: single.value,
    },
  ];
}

export function formatSharedInsulationItem(
  status: SharedInsulationStatus,
): FormattedStatusItem {
  return {
    label: "Insul:",
    value: `${fmtKm(status.closing)}km(${fmtKm(status.production)}km)`,
  };
}

export function formatSharedInsulationLine(
  status: SharedInsulationStatus,
): string {
  return `Insul: ${fmtKm(status.closing)}km(${fmtKm(status.production)}km)`;
}

/**
 * Build cable-size production status blocks from QSSTOCK FG rows.
 * Keeps the newest entry per cable · size (rows should be newest-first).
 * Near-duplicate "Other" spellings collapse via normalizeQuadSignalCableSizeKey.
 * Signalling Insulation is returned separately (shared across sizes).
 */
export function buildCableStockStatus(
  rows: Array<{
    id: string;
    date: Date;
    itemName: string;
    notes?: string | null;
  }>,
): {
  blocks: CableStockStatusBlock[];
  sharedInsulation: SharedInsulationStatus | null;
  quadInsulation: SharedInsulationStatus | null;
} {
  const byKey = new Map<string, CableStockStatusBlock>();
  let sharedInsulation: SharedInsulationStatus | null = null;
  let quadInsulation: SharedInsulationStatus | null = null;

  for (const row of rows) {
    try {
      const { meta, userNotes } = parseQuadSignalStockNotes(row.notes);
      if (!meta || meta.kind !== "cable" || !meta.cable || !meta.size) {
        continue;
      }

      const cable = meta.cable.trim();
      const size = meta.size.trim();

      const entryDate = toIsoDateString(row.date);
      if (!sharedInsulation && isSignallingCableName(cable)) {
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
            const opening = Number(meta.opening?.Insulation) || 0;
            const closingVal = Number.isFinite(insulClose) ? insulClose : 0;
            sharedInsulation = {
              entryDate,
              opening,
              production: insulProd,
              consumed: Math.max(0, Math.round((opening + insulProd - closingVal) * 1000) / 1000),
              closing: closingVal,
            };
          }
        }
      }

      if (!quadInsulation && isQuadCableName(cable)) {
        const closingMap = quadSignalClosingFromMeta(meta);
        const insulClose = Number(closingMap.Insulation);
        const insulProd = Number(meta.production?.Insulation) || 0;
        if (Number.isFinite(insulClose) || insulProd) {
          const opening = Number(meta.opening?.Insulation) || 0;
          const closingVal = Number.isFinite(insulClose) ? insulClose : 0;
          quadInsulation = {
            entryDate,
            opening,
            production: insulProd,
            consumed: Math.max(
              0,
              Math.round((opening + insulProd - closingVal) * 1000) / 1000,
            ),
            closing: closingVal,
          };
        }
      }

      // Prefer normalized key so "100P" / "100 Pair" / "100Pair" show as one card.
      const key = quadSignalCableSizeDedupeKey(cable, size);
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
      // Quad keeps Insulation on the size card so it matches P&L PROCESS WIP.
      if (isSignallingCableName(cable)) {
        names = names.filter((n) => n.trim().toLowerCase() !== "insulation");
      }

      const legacyPutupKm = parsePutupKm(meta.callPutup);
      const callPutup = String(meta.callPutup ?? "").trim();
      const putupDate = String(meta.putupDate ?? "").trim();
      const partyName = String(meta.partyName ?? "").trim();
      const dispatchParty = String(meta.dispatchParty ?? "").trim();
      const dispatchRaw = Number(meta.dispatchPending);
      const dispatchPending =
        Number.isFinite(dispatchRaw) && dispatchRaw > 0 ? dispatchRaw : 0;

      const rawPutupItems = Array.isArray(meta.callPutupItems) && meta.callPutupItems.length > 0
        ? meta.callPutupItems
        : legacyPutupKm > 0 || callPutup || partyName
          ? [{ qty: legacyPutupKm > 0 ? legacyPutupKm : callPutup, date: putupDate, partyName }]
          : [];

      const callPutupItems = rawPutupItems
        .map((item) => {
          const q = Number(item.qty);
          const qty = Number.isFinite(q) && q > 0 ? q : 0;
          const callPutupStr = String(item.qty ?? "").trim();
          const pDate = String(item.date ?? putupDate ?? "").trim();
          const pName = String(item.partyName ?? partyName ?? "").trim();
          return {
            qty,
            callPutup: callPutupStr ? `${callPutupStr}km` : "",
            putupDate: pDate,
            partyName: pName,
          };
        })
        .filter((item) => item.qty > 0 || item.partyName || item.callPutup);

      const totalPutupKm = callPutupItems.reduce((sum, item) => sum + item.qty, 0);

      const rawDispatchItems = Array.isArray(meta.dispatchPendingItems) && meta.dispatchPendingItems.length > 0
        ? meta.dispatchPendingItems
        : dispatchPending > 0 || dispatchParty
          ? [{ qty: dispatchPending, partyName: dispatchParty }]
          : [];

      const dispatchPendingItems = rawDispatchItems
        .map((item) => {
          const q = Number(item.qty);
          const qty = Number.isFinite(q) && q > 0 ? q : 0;
          const pName = String(item.partyName ?? dispatchParty ?? "").trim();
          return {
            qty,
            dispatchParty: pName,
          };
        })
        .filter((item) => item.qty > 0 || item.dispatchParty);

      const totalDispatchPending = dispatchPendingItems.reduce((sum, item) => sum + item.qty, 0);

      const processes: StockProcessLine[] = names.map((name) => {
        const closingQty = Number(closing[name]) || 0;
        return {
          name,
          shortName: shortProcessName(name),
          closing: Math.round(closingQty * 1000) / 1000,
          production: Number(production[name]) || 0,
        };
      });

      // Insul + Single Quad stay out of Total. Outer uses closing after Call putup.
      const totalKm = processes.reduce((s, p) => {
        const n = p.name.trim().toLowerCase();
        if (n === "insulation" || n === "single quad") return s;
        if (isOuterProcess(p.name)) {
          return s + outerClosingAfterPutup(p.closing, totalPutupKm);
        }
        return s + p.closing;
      }, 0);

      byKey.set(key, {
        key: `${cable} · ${size}`,
        cable,
        size,
        entryDate: toIsoDateString(row.date),
        processes,
        totalKm: Math.round(totalKm * 1000) / 1000,
        salesKm: Number(meta.salesKm) || 0,
        putupKm: Math.round(totalPutupKm * 1000) / 1000,
        callPutup,
        putupDate,
        partyName,
        dispatchParty,
        dispatchPending: Math.round(totalDispatchPending * 1000) / 1000,
        userNotes: String(userNotes ?? "").trim(),
        callPutupItems,
        dispatchPendingItems,
      });
    } catch (err) {
      console.error("[buildCableStockStatus] skipped bad row", row.id, err);
    }
  }

  return {
    blocks: Array.from(byKey.values()),
    sharedInsulation,
    quadInsulation,
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
