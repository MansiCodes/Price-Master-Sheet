import { useState } from "react";
import { PVC_FAR_DEP_PERCENT } from "@/lib/plant-catalogs";
import { useTodayHubExpenseUnload } from "@/components/today/hub/useTodayHubExpenseUnload";

export function useTodayHubExpenseFar() {
  const [farVendor, setFarVendor] = useState("");
  const [farVendorOther, setFarVendorOther] = useState("");
  const [farDescription, setFarDescription] = useState("");
  const [farBillNumber, setFarBillNumber] = useState("");
  const [farCost, setFarCost] = useState("");
  const [farGst, setFarGst] = useState("");
  const [farDepPercent, setFarDepPercent] = useState(String(PVC_FAR_DEP_PERCENT));
  const unload = useTodayHubExpenseUnload();
  return {
    farVendor, setFarVendor, farVendorOther, setFarVendorOther,
    farDescription, setFarDescription, farBillNumber, setFarBillNumber,
    farCost, setFarCost, farGst, setFarGst, farDepPercent, setFarDepPercent, ...unload,
  };
}
