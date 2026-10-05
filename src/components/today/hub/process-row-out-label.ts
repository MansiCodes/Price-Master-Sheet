import type { WipCalcResult } from "@/lib/quad-signal-wip";

export function processRowOutLabel(stage: WipCalcResult["stages"][number] | undefined) {
  if (stage?.outboundKind === "sales") return `Sales ${stage.outbound}`;
  if (stage?.outboundKind === "insulation_to_laying") return `→ Lay ${stage.outbound}`;
  if (stage?.outboundKind === "next_process") return String(stage.outbound);
  if (stage != null) return String(stage.outbound);
  return "—";
}

export function isOuterProcessName(proc: string) {
  const n = proc.trim().toLowerCase();
  return n === "outer" || n === "outer sheath";
}

export function outerFormOutAndClose(
  openingVal: number,
  productionRaw: string,
  orderPutupKm: number,
) {
  const raw = productionRaw.trim();
  const prod = raw === "" || raw === "." ? 0 : Number(raw);
  const p = Number.isFinite(prod) && prod >= 0 ? prod : 0;
  const putup = Number(orderPutupKm) > 0 ? Number(orderPutupKm) : 0;
  return {
    out: putup,
    closing: Math.round((openingVal + p - putup) * 1000) / 1000,
  };
}

export function sumCallPutupKm(items: Array<{ qty?: string | number | null }>) {
  return items.reduce((sum, item) => {
    const n = Number(item.qty);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

export type NoteCallPutup = {
  qty: number | string;
  date?: string;
  partyName?: string;
};

export function callPutupItemsFromCableMeta(meta: {
  callPutupItems?: NoteCallPutup[];
  callPutup?: string;
  putupDate?: string;
  partyName?: string;
} | null | undefined): NoteCallPutup[] {
  if (!meta) return [];
  if (Array.isArray(meta.callPutupItems) && meta.callPutupItems.length > 0) {
    return meta.callPutupItems.map((item) => ({
      qty: item.qty,
      date: item.date,
      partyName: item.partyName,
    }));
  }
  if (meta.callPutup || meta.putupDate || meta.partyName) {
    return [{
      qty: meta.callPutup ?? "",
      date: meta.putupDate,
      partyName: meta.partyName,
    }];
  }
  return [];
}

export function mergeNoteCallPutups(items: NoteCallPutup[]): NoteCallPutup[] {
  const seen = new Set<string>();
  const out: NoteCallPutup[] = [];
  for (const item of items) {
    const key = `${item.qty}|${item.date ?? ""}|${item.partyName ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function frozenCallPutupKm(originalKm: number | undefined, items: NoteCallPutup[]) {
  const orig = Number(originalKm);
  const frozen = Number.isFinite(orig) && orig > 0 ? orig : 0;
  return Math.max(frozen, sumCallPutupKm(items));
}

export function applyOuterCallPutupClosing(
  byProcess: Record<string, number>,
  opening: Record<string, number>,
  production: Record<string, number>,
  putupKm: number,
) {
  const next = { ...byProcess };
  for (const key of Object.keys(next)) {
    if (!isOuterProcessName(key)) continue;
    const live = outerFormOutAndClose(
      Number(opening[key] ?? 0),
      String(production[key] ?? ""),
      putupKm,
    );
    next[key] = live.closing;
  }
  return next;
}

export function processRowOpening(
  stage: WipCalcResult["stages"][number] | undefined,
  stockWipOpening: Record<string, string>,
  proc: string,
) {
  return stage?.opening ?? (stockWipOpening[proc]?.trim() ? Number(stockWipOpening[proc]) : 0);
}
