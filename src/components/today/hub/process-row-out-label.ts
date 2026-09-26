import type { WipCalcResult } from "@/lib/quad-signal-wip";

export function processRowOutLabel(stage: WipCalcResult["stages"][number] | undefined) {
  if (stage?.outboundKind === "sales") return `Sales ${stage.outbound}`;
  if (stage?.outboundKind === "insulation_to_laying") return `→ Lay ${stage.outbound}`;
  if (stage?.outboundKind === "next_process") return String(stage.outbound);
  if (stage != null) return String(stage.outbound);
  return "—";
}

export function processRowOpening(
  stage: WipCalcResult["stages"][number] | undefined,
  stockWipOpening: Record<string, string>,
  proc: string,
) {
  return stage?.opening ?? (stockWipOpening[proc]?.trim() ? Number(stockWipOpening[proc]) : 0);
}
