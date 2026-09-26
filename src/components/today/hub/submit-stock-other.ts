import { postJson } from "@/lib/client-forms";
import type { SubmitOutcome } from "@/components/today/hub/submit-types";
import type { SubmitStockOtherArgs } from "@/components/today/hub/submit-args";
import { stockOtherItemName, stockOtherUnit, validateStockOther } from "@/components/today/hub/validate-stock-other";
import { buildStockOtherNotes } from "@/components/today/hub/build-stock-other-notes";

export async function submitStockOther(a: SubmitStockOtherArgs): Promise<SubmitOutcome> {
  const invalid = validateStockOther(a);
  if (invalid) return invalid;
  const result = await postJson(`/api/plants/${a.plantId}/stock`, {
    date: a.entryDate,
    shift: a.shift,
    itemName: stockOtherItemName(a),
    category: a.stockCategory === "Other" ? "RM" : a.stockCategory,
    unit: stockOtherUnit(a),
    quantity: a.issuedQty,
    rate: a.closingRate,
    value: a.closingValue,
    notes: buildStockOtherNotes(a),
    photoUrls: a.stockPhotos,
  });
  return { status: "ok", result };
}
