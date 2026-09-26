import { useState } from "react";
import { PRODUCT_UNITS } from "@/lib/units";
import { PRODUCTS } from "@/components/today/today-hub-model";

export function useTodayHubMiscProd() {
  const [productName, setProductName] = useState<string>(PRODUCTS[0].name);
  const [prodQty, setProdQty] = useState("");
  const [prodUnit, setProdUnit] = useState<(typeof PRODUCT_UNITS)[number]>(PRODUCTS[0].unit);
  const [mgr, setMgr] = useState("1");
  const [ops, setOps] = useState("8");
  const [helpers, setHelpers] = useState("4");
  const manpowerCost =
    Number(mgr || 0) * 4000 + Number(ops || 0) * 1500 + Number(helpers || 0) * 800;
  return {
    productName, setProductName, prodQty, setProdQty, prodUnit, setProdUnit,
    mgr, setMgr, ops, setOps, helpers, setHelpers, manpowerCost,
  };
}
