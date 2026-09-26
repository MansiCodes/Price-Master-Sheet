import { postJson } from "@/lib/client-forms";
import type { SubmitOutcome } from "@/components/today/hub/submit-types";
import type { SubmitSaleArgs } from "@/components/today/hub/submit-args";
import { validateSaleLines } from "@/components/today/hub/validate-sale-lines";
import { buildSaleBody, mapSaleItems, resolvedCustomerName } from "@/components/today/hub/build-sale-payload";

export async function submitSale(args: SubmitSaleArgs): Promise<SubmitOutcome> {
  const customer = resolvedCustomerName(args.customerName, args.customerNameOther);
  const invalid = validateSaleLines(args.saleLines, args.fail);
  if (invalid) return invalid;
  const items = mapSaleItems(args.saleLines, args.isCat6);
  if (!customer || items.length === 0) {
    args.fail("Add customer and at least one product.");
    return { status: "failed" };
  }
  if (!args.isCat6 && args.saleType === "OTHERS" && !args.saleTypeOther.trim()) {
    args.fail("Describe the sales type for Others.");
    return { status: "failed" };
  }
  const result = await postJson(
    `/api/plants/${args.plantId}/sales`,
    buildSaleBody({ ...args, resolvedCustomerName: customer, items }),
  );
  return { status: "ok", result };
}
