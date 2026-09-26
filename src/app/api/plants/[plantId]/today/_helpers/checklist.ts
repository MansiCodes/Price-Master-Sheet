import type { ShiftKey } from "@/lib/shift-completion";
import { computeDayShiftCompletions } from "@/lib/shift-completion";

export const CHECKLIST_KEYS = [
  { key: "purchaseFilled", label: "Purchase", href: "purchase" },
  { key: "saleFilled", label: "Sales", href: "sale" },
  { key: "stockFilled", label: "Stock", href: "stock" },
  { key: "productionFilled", label: "Production", href: "production" },
  { key: "pettyCashFilled", label: "Petty Cash", href: "petty-cash" },
] as const;

export function buildChecklist(
  shift: ShiftKey,
  modules: Awaited<
    ReturnType<typeof computeDayShiftCompletions>
  >[ShiftKey]["modules"],
) {
  return CHECKLIST_KEYS.map((item) => {
    const mod = modules.find((m) => m.key === item.key);
    return {
      shift,
      key: item.key.replace("Filled", ""),
      label: item.label,
      filled: mod?.filled ?? false,
      href: item.href,
    };
  });
}
