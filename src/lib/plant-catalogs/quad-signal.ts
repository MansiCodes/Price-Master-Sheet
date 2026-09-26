import { normalizeCableName } from "@/lib/quad-signal-wip";
import { toSizeMatchKey } from "@/lib/stock/order-excel-types";

export {
  QUAD_RAW_MATERIALS,
  QUAD_RAW_MATERIAL_VENDORS,
  QUAD_SIGNAL_CUSTOMERS,
  QUAD_SIGNAL_SALE_PRODUCTS,
  QUAD_SIGNAL_STOCK_RAW_MATERIALS,
  QUAD_STOCK_PARTICULARS,
  getQuadSignalPurchaseGoods,
  getQuadVendorsForMaterial,
} from "./quad-signal-materials";
export {
  QUAD_SIGNAL_CABLE_PROCESSES,
  QUAD_SIGNAL_CABLE_SIZES,
  QUAD_SIGNAL_STOCK_CABLES,
  getQuadSignalCableProcesses,
  getQuadSignalCableSizes,
} from "./quad-signal-cables";

export type QuadSignalStockMeta = {
  /** v1 = legacy process snapshot; v2 = production + WIP closing snapshot. */
  v: 1 | 2;
  kind: "raw" | "cable";
  cable?: string;
  size?: string;
  /** Legacy (v1) or alias: treated as closing when opening/closing absent. */
  processes?: Record<string, number>;
  /** Today's production by process (v2). */
  production?: Record<string, number>;
  opening?: Record<string, number>;
  closing?: Record<string, number>;
  /** Finished-stock sales km summed from Sales ledger (v2). */
  salesKm?: number;
  /** Call put-up reference (per cable/size entry). */
  callPutup?: string;
  /** Put-up date (per cable/size entry). */
  putupDate?: string;
  /** Party for call put-up (legacy field name kept for older rows). */
  partyName?: string;
  /** Party for dispatch pending (falls back to partyName when absent). */
  dispatchParty?: string;
  /** Dispatch pending qty (km). */
  dispatchPending?: number;
  callPutupItems?: Array<{
    qty: number | string;
    date?: string;
    partyName?: string;
  }>;
  dispatchPendingItems?: Array<{
    qty: number | string;
    partyName?: string;
  }>;
  calcSnapshot?: {
    coreCount: number;
    lengthFactor: number;
    layingProduced: number;
    insulationConsumed: number;
    salesKm: number;
    drumLabel?: string;
  };
  /**
   * Signalling Cable only: Insulation is one pool across sizes.
   * Extra size rows contribute laying×cores×factor to the shared deduction.
   */
  sharedInsulation?: {
    consumed: number;
    closing: number;
    contributions: Array<{
      size: string;
      layingProduced: number;
      coreCount: number;
      lengthFactor: number;
      consumed: number;
    }>;
  };
};

const QS_STOCK_PREFIX = "QSSTOCK:";

export function encodeQuadSignalStockNotes(
  meta: QuadSignalStockMeta,
  userNotes?: string | null,
): string {
  const payload = `${QS_STOCK_PREFIX}${JSON.stringify(meta)}`;
  const extra = userNotes?.trim();
  return extra ? `${payload}\n${extra}` : payload;
}

export function parseQuadSignalStockNotes(notes: string | null | undefined): {
  meta: QuadSignalStockMeta | null;
  userNotes: string;
} {
  const raw = notes?.trim() ?? "";
  if (!raw.startsWith(QS_STOCK_PREFIX)) {
    return { meta: null, userNotes: raw };
  }
  const rest = raw.slice(QS_STOCK_PREFIX.length);
  const nl = rest.indexOf("\n");
  const jsonPart = nl >= 0 ? rest.slice(0, nl) : rest;
  const userNotes = nl >= 0 ? rest.slice(nl + 1).trim() : "";
  try {
    const meta = JSON.parse(jsonPart) as QuadSignalStockMeta;
    if (
      (meta?.v === 1 || meta?.v === 2) &&
      (meta.kind === "raw" || meta.kind === "cable")
    ) {
      return { meta, userNotes };
    }
  } catch {
    /* ignore */
  }
  return { meta: null, userNotes: raw };
}

/**
 * Collapse near-duplicate size spellings & spacing variations
 * (e.g. "12 Core x 1.5 sqmm LZSH" ≈ "12 Core x 1.5sqmm LSZH").
 */
export function normalizeQuadSignalCableSizeKey(size: string): string {
  return toSizeMatchKey(size);
}

/** Cable + normalized size — used to dedupe Other re-entries. */
export function quadSignalCableSizeDedupeKey(
  cable: string,
  size: string,
): string {
  const normCable = normalizeCableName(cable);
  return `${normCable}::${normalizeQuadSignalCableSizeKey(size)}`;
}

/** Closing balances from a stock notes meta (v2 closing, else v1 processes). */
export function quadSignalClosingFromMeta(
  meta: QuadSignalStockMeta | null | undefined,
): Record<string, number> {
  if (!meta || meta.kind !== "cable") return {};
  if (meta.closing && Object.keys(meta.closing).length > 0) return meta.closing;
  if (meta.processes && Object.keys(meta.processes).length > 0)
    return meta.processes;
  return {};
}
