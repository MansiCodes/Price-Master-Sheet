import { isQuadSignalPlant } from "@/lib/plant-layout";
import {
  CAT6_DIRECT_EXPENSE_HEADS,
  CAT6_EXPENSE_HEADS,
  CAT6_INDIRECT_EXPENSE_HEADS,
  DEFAULT_EXPENSE_HEADS,
  LED_DIRECT_EXPENSE_HEADS,
  LED_EXPENSE_HEADS,
  LED_INDIRECT_EXPENSE_HEADS,
  PVC_DIRECT_EXPENSE_HEADS,
  PVC_EXPENSE_HEADS,
  PVC_INDIRECT_EXPENSE_HEADS,
  UPCAST_DIRECT_EXPENSE_HEADS,
  UPCAST_DIRECT_MISC_NATURES,
  UPCAST_EXPENSE_HEADS,
  UPCAST_INDIRECT_EXPENSE_HEADS,
  UPCAST_INDIRECT_MISC_NATURES,
  type PvcExpenseSection,
} from "./expense-heads";
import {
  normalizePvcExpenseHead,
  normalizeUpcastExpenseHead,
  upcastEntryHead,
} from "./expense-normalize";

export {
  normalizePvcExpenseHead,
  normalizeUpcastExpenseHead,
  upcastEntryHead,
  isTypedExpenseCategory,
  expenseTypeLabel,
  expenseTypeTotalLabel,
} from "./expense-normalize";
export {
  cat6ExpensePnlLine,
  expenseHeadLabelLines,
  expenseHeadTabLabel,
  pvcExpensePnlLine,
  upcastExpensePnlLine,
} from "./expense-pnl-lines";

export function getPvcExpenseHeadsForSection(
  section: PvcExpenseSection,
): readonly string[] {
  return section === "direct"
    ? PVC_DIRECT_EXPENSE_HEADS
    : PVC_INDIRECT_EXPENSE_HEADS;
}

export function getExpenseHeadsForSection(
  plantCode: string | null | undefined,
  section: PvcExpenseSection,
): readonly string[] {
  const code = plantCode?.toUpperCase() ?? "";
  if (code === "PVC") return getPvcExpenseHeadsForSection(section);
  if (code === "CAT6") {
    return section === "direct"
      ? CAT6_DIRECT_EXPENSE_HEADS
      : CAT6_INDIRECT_EXPENSE_HEADS;
  }
  if (code === "UPCAST") {
    return section === "direct"
      ? UPCAST_DIRECT_EXPENSE_HEADS
      : UPCAST_INDIRECT_EXPENSE_HEADS;
  }
  if (code === "LEDROPE" || code === "SLSSL" || isQuadSignalPlant(code)) {
    return section === "direct"
      ? LED_DIRECT_EXPENSE_HEADS
      : LED_INDIRECT_EXPENSE_HEADS;
  }
  return section === "direct"
    ? LED_DIRECT_EXPENSE_HEADS
    : LED_INDIRECT_EXPENSE_HEADS;
}

export function getUpcastMiscNaturesForSection(
  section: PvcExpenseSection,
): readonly string[] {
  return section === "indirect"
    ? UPCAST_INDIRECT_MISC_NATURES
    : UPCAST_DIRECT_MISC_NATURES;
}

/** Direct misc query includes Graphite Flakes rows folded into Freight & Others. */
export function getUpcastMiscQueryHeads(
  section: PvcExpenseSection,
): string[] {
  const natures = [...getUpcastMiscNaturesForSection(section)];
  if (section === "direct") natures.push("Graphite Flakes");
  return natures;
}

/** All plants use Direct / Indirect expense UI. */
export function usesExpenseSections(
  _plantCode?: string | null,
): boolean {
  return true;
}

export function pvcExpenseSection(head: string): PvcExpenseSection {
  const normalized = normalizePvcExpenseHead(head);
  if (
    (PVC_DIRECT_EXPENSE_HEADS as readonly string[]).includes(normalized) ||
    normalized === "Electricity"
  ) {
    return "direct";
  }
  return "indirect";
}

export function expenseSectionForPlant(
  plantCode: string | null | undefined,
  head: string,
): PvcExpenseSection {
  const code = plantCode?.toUpperCase() ?? "";
  const normalized = head.trim();
  if (
    normalizePvcExpenseHead(normalized) === "FAR" ||
    normalized === "Financial Cost"
  ) {
    return "indirect";
  }
  if (code === "PVC") return pvcExpenseSection(head);
  if (code === "CAT6") {
    if (
      (CAT6_DIRECT_EXPENSE_HEADS as readonly string[]).includes(normalized)
    ) {
      return "direct";
    }
    return "indirect";
  }
  if (code === "UPCAST") {
    const upcastHead = normalizeUpcastExpenseHead(normalized);
    if (
      (UPCAST_INDIRECT_EXPENSE_HEADS as readonly string[]).includes(upcastHead) ||
      (UPCAST_INDIRECT_MISC_NATURES as readonly string[]).includes(upcastHead) ||
      upcastHead === "Depreciation"
    ) {
      return "indirect";
    }
    if (
      (UPCAST_DIRECT_EXPENSE_HEADS as readonly string[]).includes(upcastHead) ||
      (UPCAST_DIRECT_MISC_NATURES as readonly string[]).includes(upcastHead)
    ) {
      return "direct";
    }
    return "indirect";
  }
  if (code === "LEDROPE" || code === "SLSSL" || isQuadSignalPlant(code)) {
    if (
      (LED_DIRECT_EXPENSE_HEADS as readonly string[]).includes(normalized)
    ) {
      return "direct";
    }
    return "indirect";
  }
  return head.trim() === "Other" ? "direct" : "indirect";
}

export function getPvcExpenseHeads(): readonly string[] {
  return PVC_EXPENSE_HEADS;
}

/** Expense category buttons for a plant (P&L Expense tab + Today form). */
export function getExpenseHeads(plantCode?: string | null): readonly string[] {
  const code = plantCode?.toUpperCase() ?? "";
  if (code === "PVC") return PVC_EXPENSE_HEADS;
  if (code === "CAT6") return CAT6_EXPENSE_HEADS;
  if (code === "UPCAST") return UPCAST_EXPENSE_HEADS;
  if (code === "LEDROPE" || code === "SLSSL" || isQuadSignalPlant(code)) {
    return LED_EXPENSE_HEADS;
  }
  return DEFAULT_EXPENSE_HEADS;
}
