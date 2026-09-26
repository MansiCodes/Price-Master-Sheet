import { useState } from "react";

export function useTodayHubUpcastFields() {
  const [upcastOpeningQty, setUpcastOpeningQty] = useState("");
  const [upcastIncomingQty, setUpcastIncomingQty] = useState("");
  const [upcastOutwardQty, setUpcastOutwardQty] = useState("");
  const [upcastTotalScrapWeight, setUpcastTotalScrapWeight] = useState("");
  const [upcastPettyQty, setUpcastPettyQty] = useState("");
  const [upcastWeightPerPetty, setUpcastWeightPerPetty] = useState("");
  const [upcastBurningLossWeight, setUpcastBurningLossWeight] = useState("");
  const [upcastRod8mmWeight, setUpcastRod8mmWeight] = useState("");
  const [upcastWire8mmTo1_6mmWeight, setUpcastWire8mmTo1_6mmWeight] = useState("");
  const [upcastWire1_6mmWeight, setUpcastWire1_6mmWeight] = useState("");
  return {
    upcastOpeningQty, setUpcastOpeningQty, upcastIncomingQty, setUpcastIncomingQty,
    upcastOutwardQty, setUpcastOutwardQty, upcastTotalScrapWeight, setUpcastTotalScrapWeight,
    upcastPettyQty, setUpcastPettyQty, upcastWeightPerPetty, setUpcastWeightPerPetty,
    upcastBurningLossWeight, setUpcastBurningLossWeight, upcastRod8mmWeight, setUpcastRod8mmWeight,
    upcastWire8mmTo1_6mmWeight, setUpcastWire8mmTo1_6mmWeight,
    upcastWire1_6mmWeight, setUpcastWire1_6mmWeight,
  };
}
