import { useState } from "react";
import { PVC_UNLOADING_RATE_PER_MT } from "@/lib/plant-catalogs";

export function useTodayHubExpenseUnload() {
  const [unloadQtyMt, setUnloadQtyMt] = useState("");
  const [unloadRatePerMt, setUnloadRatePerMt] = useState(String(PVC_UNLOADING_RATE_PER_MT));
  return { unloadQtyMt, setUnloadQtyMt, unloadRatePerMt, setUnloadRatePerMt };
}
