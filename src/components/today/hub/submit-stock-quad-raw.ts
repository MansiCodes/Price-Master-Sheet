import { postJson } from "@/lib/client-forms";
import { encodeQuadSignalStockNotes } from "@/lib/plant-catalogs";
import type { SubmitOutcome } from "@/components/today/hub/submit-types";
import type { SubmitStockQuadRawArgs } from "@/components/today/hub/submit-args";

export function validateStockQuadRaw(args: SubmitStockQuadRawArgs): SubmitOutcome | null {
  if (!args.resolvedItem || args.stockQty === "") {
    args.fail(
      (args.stockItem === "Others" || args.stockItem === "Other" || args.stockItem === "others") &&
        !args.stockItemOther.trim()
        ? "Enter the other raw material name."
        : "Select raw material and quantity.",
    );
    return { status: "failed" };
  }
  if (!(args.issuedQty >= 0)) {
    args.fail("Quantity must be zero or more.");
    return { status: "failed" };
  }
  return null;
}

export async function submitStockQuadRaw(args: SubmitStockQuadRawArgs): Promise<SubmitOutcome> {
  const invalid = validateStockQuadRaw(args);
  if (invalid) return invalid;
  const result = await postJson(`/api/plants/${args.plantId}/stock`, {
    date: args.entryDate,
    shift: args.shift,
    itemName: args.resolvedItem,
    category: "RM",
    unit: args.stockUnit || "KGS",
    quantity: args.issuedQty,
    rate: args.closingRate,
    value: args.closingValue,
    notes: encodeQuadSignalStockNotes(
      { v: 1, kind: "raw" },
      args.stockNotes.trim() || `Closing stock as on ${args.entryDate}`,
    ),
    photoUrls: args.stockPhotos,
  });
  return { status: "ok", result };
}
