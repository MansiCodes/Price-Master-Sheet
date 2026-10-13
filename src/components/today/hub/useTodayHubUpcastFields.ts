import { useState } from "react";

export type UpcastPettyItem = { qty: string; weight: string };

export const EMPTY_UPCAST_PETTY_ITEM: UpcastPettyItem = { qty: "", weight: "" };

export function useTodayHubUpcastFields() {
  const [upcastOpeningQty, setUpcastOpeningQty] = useState("");
  const [upcastIncomingQty, setUpcastIncomingQty] = useState("");
  const [upcastOutwardQty, setUpcastOutwardQty] = useState("");
  const [upcastTotalScrapWeight, setUpcastTotalScrapWeight] = useState("");
  const [upcastPettyItems, setUpcastPettyItems] = useState<UpcastPettyItem[]>([
    { ...EMPTY_UPCAST_PETTY_ITEM },
  ]);
  const [upcastBurningLossWeight, setUpcastBurningLossWeight] = useState("");
  const [upcastRod8mmWeight, setUpcastRod8mmWeight] = useState("");
  const [upcastWire8mmTo1_6mmWeight, setUpcastWire8mmTo1_6mmWeight] = useState("");
  const [upcastWire1_6mmWeight, setUpcastWire1_6mmWeight] = useState("");
  return {
    upcastOpeningQty, setUpcastOpeningQty, upcastIncomingQty, setUpcastIncomingQty,
    upcastOutwardQty, setUpcastOutwardQty, upcastTotalScrapWeight, setUpcastTotalScrapWeight,
    upcastPettyItems, setUpcastPettyItems,
    upcastBurningLossWeight, setUpcastBurningLossWeight, upcastRod8mmWeight, setUpcastRod8mmWeight,
    upcastWire8mmTo1_6mmWeight, setUpcastWire8mmTo1_6mmWeight,
    upcastWire1_6mmWeight, setUpcastWire1_6mmWeight,
  };
}
