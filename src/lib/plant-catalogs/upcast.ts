import { STOCK_CLOSING_NOTE_PREFIX } from "./stock-note-prefixes";

export type UpcastStockMeta = {
  opening: number;
  incoming: number;
  outward: number;
  closing: number;
  totalScrapWeight?: number;
  pettyQty?: number;
  weightPerPetty?: number;
  totalPettyWeight?: number;
  sortingLossWeight?: number;
  burningLossWeight?: number;
  weightAfterBurning?: number;
  rod8mmWeight?: number;
  wire8mmTo1_6mmWeight?: number;
  wire1_6mmWeight?: number;
  totalOutputWeight?: number;
  castingLossWeight?: number;
};

export const UPCAST_STOCK_PREFIX = "UPCASTSTOCK:";

export function encodeUpcastStockNotes(
  meta: UpcastStockMeta,
  userNotes?: string | null,
): string {
  const payload = `${UPCAST_STOCK_PREFIX}${JSON.stringify(meta)}`;
  const extra = userNotes?.trim();
  return extra ? `${payload}\n${extra}` : payload;
}

export function parseUpcastStockNotes(notes: string | null | undefined): {
  meta: UpcastStockMeta | null;
  userNotes: string;
} {
  const raw = notes?.trim() ?? "";
  if (!raw.startsWith(UPCAST_STOCK_PREFIX)) {
    return { meta: null, userNotes: raw };
  }
  const rest = raw.slice(UPCAST_STOCK_PREFIX.length);
  const nl = rest.indexOf("\n");
  const jsonPart = nl >= 0 ? rest.slice(0, nl) : rest;
  const userNotes = nl >= 0 ? rest.slice(nl + 1).trim() : "";
  try {
    const meta = JSON.parse(jsonPart) as UpcastStockMeta;
    if (meta && typeof meta.opening === "number" && typeof meta.closing === "number") {
      return { meta, userNotes };
    }
  } catch {
    /* ignore */
  }
  return { meta: null, userNotes: raw };
}

/** Upcast stock entries are closing snapshots (same P&L notes as PVC). */
export const UPCAST_STOCK_ENTRY_TYPES = [
  { value: "closing", label: "Closing stock" },
] as const;

export type UpcastStockEntryType =
  (typeof UPCAST_STOCK_ENTRY_TYPES)[number]["value"];

export function upcastStockEntryNotes(
  _entryType: UpcastStockEntryType,
  date: string,
  customNotes?: string | null,
): string {
  const custom = customNotes?.trim();
  if (custom) return custom;
  return `${STOCK_CLOSING_NOTE_PREFIX} as on ${date}`;
}
