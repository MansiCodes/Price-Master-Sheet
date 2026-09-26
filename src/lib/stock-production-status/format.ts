import type {
  CableStockStatusBlock,
  CallPutupStatusItem,
  DispatchPendingStatusItem,
  FormattedStatusItem,
  SharedInsulationStatus,
  StockProcessLine,
} from "./types";

export function shortProcessName(name: string): string {
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

export function isOuterProcess(name: string): boolean {
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
