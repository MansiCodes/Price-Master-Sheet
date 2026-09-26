import { postJson } from "@/lib/client-forms";
import type { SubmitOutcome } from "@/components/today/hub/submit-types";
import type { SubmitPurchaseArgs } from "@/components/today/hub/submit-args";
import { validatePurchaseLines } from "@/components/today/hub/validate-purchase-lines";
import { buildPurchaseBody, mapPurchaseItems } from "@/components/today/hub/build-purchase-payload";

export async function submitPurchase(args: SubmitPurchaseArgs): Promise<SubmitOutcome> {
  const resolvedVendorName =
    args.vendorName === "Other" ? args.vendorNameOther.trim() : args.vendorName.trim();
  const invalid = validatePurchaseLines(args.purchaseLines, args.fail);
  if (invalid) return invalid;
  const items = mapPurchaseItems(args.purchaseLines, args.isCat6);
  if (args.purchaseSource !== "atcl" && (!resolvedVendorName || items.length === 0)) {
    args.fail("Add supplier and at least one description item.");
    return { status: "failed" };
  }
  if (args.purchaseSource === "atcl" && items.length === 0) {
    args.fail("Add at least one inward stock line.");
    return { status: "failed" };
  }
  if (args.purchaseType === "OTHERS" && !args.purchaseTypeOther.trim()) {
    args.fail("Describe the purchase type for Others.");
    return { status: "failed" };
  }
  const result = await postJson(
    `/api/plants/${args.plantId}/purchases`,
    buildPurchaseBody({ ...args, resolvedVendorName, items }),
  );
  return { status: "ok", result };
}
