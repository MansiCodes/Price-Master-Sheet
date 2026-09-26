import type { LineItem } from "@/components/today/today-hub-model";
import type { FailFn, SubmitOutcome } from "@/components/today/hub/submit-types";

export function validateSaleLines(saleLines: LineItem[], fail: FailFn): SubmitOutcome | null {
  for (let i = 0; i < saleLines.length; i++) {
    const l = saleLines[i];
    const desc = l.itemDescription.trim();
    const qty = Number(l.quantity);
    const rateRaw = l.rate.trim();
    const rate = rateRaw === "" ? 0 : Number(rateRaw);
    if (saleLines.length === 1 || desc || l.quantity || l.rate) {
      if (!desc) {
        fail(`Select or enter product details for item ${i + 1}.`);
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
