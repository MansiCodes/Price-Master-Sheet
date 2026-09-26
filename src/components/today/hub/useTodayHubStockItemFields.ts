import { useState } from "react";
import { DEFAULT_PURCHASE_GOODS } from "@/lib/plant-catalogs";

export function useTodayHubStockItemFields() {
  const [stockItem, setStockItem] = useState<string>(DEFAULT_PURCHASE_GOODS[0]);
  const [stockItemOther, setStockItemOther] = useState("");
  const [stockSize, setStockSize] = useState("8mm");
  const [stockSizeOther, setStockSizeOther] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockUnit, setStockUnit] = useState("KGS");
  const [stockRate, setStockRate] = useState("");
  const [stockValue, setStockValue] = useState("");
  return {
    stockItem,
    setStockItem,
    stockItemOther,
    setStockItemOther,
    stockSize,
    setStockSize,
    stockSizeOther,
    setStockSizeOther,
    stockQty,
    setStockQty,
    stockUnit,
    setStockUnit,
    stockRate,
    setStockRate,
    stockValue,
    setStockValue,
  };
}
