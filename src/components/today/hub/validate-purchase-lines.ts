import type { LineItem } from "@/components/today/today-hub-model";
import type { FailFn, SubmitOutcome } from "@/components/today/hub/submit-types";

export function validatePurchaseLines(
  purchaseLines: LineItem[],
  fail: FailFn,
): SubmitOutcome | null {
  for (let i = 0; i < purchaseLines.length; i++) {
    const l = purchaseLines[i];
    const desc = l.itemDescription.trim();
    const qty = Number(l.quantity);
    const rateRaw = l.rate.trim();
    const rate = rateRaw === "" ? 0 : Number(rateRaw);
    if (purchaseLines.length === 1 || desc || l.quantity || l.rate) {
      if (!desc) {
        fail(`Select or enter description for item ${i + 1}.`);
        return { status: "failed" };
      }
      if (!(qty > 0)) {
        fail(`Enter a valid quantity greater than 0 for item ${i + 1}.`);
        return { status: "failed" };
      }
      if (rateRaw !== "" && (!Number.isFinite(rate) || rate < 0)) {
        fail(`Enter a valid rate for item ${i + 1}.`);
        return { status: "failed" };
      }
    }
  }
  return null;
}
