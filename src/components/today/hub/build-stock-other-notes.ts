import { encodeUpcastStockNotes, pvcStockEntryNotes } from "@/lib/plant-catalogs";
import type { SubmitStockOtherArgs } from "@/components/today/hub/submit-args";

export function buildUpcastStockNotes(a: SubmitStockOtherArgs) {
  return encodeUpcastStockNotes(
    {
      opening: Number(a.upcastOpeningQty) || 0,
      incoming: Number(a.upcastIncomingQty) || 0,
      outward: Number(a.upcastOutwardQty) || 0,
      closing: a.issuedQty,
      totalScrapWeight: Number(a.upcastTotalScrapWeight) || 0,
      pettyQty: Number(a.upcastPettyQty) || 0,
      weightPerPetty: Number(a.upcastWeightPerPetty) || 0,
      totalPettyWeight: a.upcastTotalPettyWeight,
      sortingLossWeight: a.upcastSortingLossWeight,
      burningLossWeight: Number(a.upcastBurningLossWeight) || 0,
      weightAfterBurning: a.upcastWeightAfterBurning,
      rod8mmWeight: Number(a.upcastRod8mmWeight) || 0,
      wire8mmTo1_6mmWeight: Number(a.upcastWire8mmTo1_6mmWeight) || 0,
      wire1_6mmWeight: Number(a.upcastWire1_6mmWeight) || 0,
      totalOutputWeight: a.upcastTotalOutputWeight,
      castingLossWeight: a.upcastCastingLossWeight,
    },
    a.stockNotes,
  );
}

export function buildStockOtherNotes(a: SubmitStockOtherArgs) {
  if (a.isUpcast) return buildUpcastStockNotes(a);
  if (a.isPvc) return pvcStockEntryNotes(a.stockType, a.entryDate, a.stockNotes);
  return a.stockNotes.trim() || `Closing stock as on ${a.entryDate}`;
}
