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

export function processRowOpening(
  stage: WipCalcResult["stages"][number] | undefined,
  stockWipOpening: Record<string, string>,
  proc: string,
) {
  return stage?.opening ?? (stockWipOpening[proc]?.trim() ? Number(stockWipOpening[proc]) : 0);
}
