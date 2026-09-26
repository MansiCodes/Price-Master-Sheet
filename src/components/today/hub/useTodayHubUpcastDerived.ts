import { useMemo } from "react";
import type { useTodayHubUpcastFields } from "@/components/today/hub/useTodayHubUpcastFields";
import {
  computeUpcastCastingLoss,
  computeUpcastClosing,
  computeUpcastOutputWeight,
  computeUpcastPettyWeight,
  computeUpcastSortingLoss,
  computeUpcastWeightAfterBurning,
} from "@/components/today/hub/compute-upcast-derived";

type Fields = ReturnType<typeof useTodayHubUpcastFields>;

export function useTodayHubUpcastBalance(isUpcast: boolean, fields: Fields) {
  const upcastCalculatedClosing = useMemo(
    () => computeUpcastClosing(isUpcast, fields.upcastOpeningQty, fields.upcastIncomingQty, fields.upcastOutwardQty),
    [isUpcast, fields.upcastOpeningQty, fields.upcastIncomingQty, fields.upcastOutwardQty],
  );
  const upcastTotalPettyWeight = useMemo(
    () => computeUpcastPettyWeight(isUpcast, fields.upcastPettyQty, fields.upcastWeightPerPetty),
    [isUpcast, fields.upcastPettyQty, fields.upcastWeightPerPetty],
  );
  const upcastSortingLossWeight = useMemo(
    () => computeUpcastSortingLoss(isUpcast, fields.upcastTotalScrapWeight, upcastTotalPettyWeight),
    [isUpcast, fields.upcastTotalScrapWeight, upcastTotalPettyWeight],
  );
  return { upcastCalculatedClosing, upcastTotalPettyWeight, upcastSortingLossWeight };
}

export function useTodayHubUpcastOutput(isUpcast: boolean, fields: Fields, pettyWeight: number) {
  const upcastWeightAfterBurning = useMemo(
    () => computeUpcastWeightAfterBurning(isUpcast, pettyWeight, fields.upcastBurningLossWeight),
    [isUpcast, pettyWeight, fields.upcastBurningLossWeight],
  );
  const upcastTotalOutputWeight = useMemo(
    () => computeUpcastOutputWeight(
      isUpcast, fields.upcastRod8mmWeight, fields.upcastWire8mmTo1_6mmWeight, fields.upcastWire1_6mmWeight,
    ),
    [isUpcast, fields.upcastRod8mmWeight, fields.upcastWire8mmTo1_6mmWeight, fields.upcastWire1_6mmWeight],
  );
  const upcastCastingLossWeight = useMemo(
    () => computeUpcastCastingLoss(isUpcast, upcastWeightAfterBurning, upcastTotalOutputWeight),
    [isUpcast, upcastWeightAfterBurning, upcastTotalOutputWeight],
  );
  return { upcastWeightAfterBurning, upcastTotalOutputWeight, upcastCastingLossWeight };
}
