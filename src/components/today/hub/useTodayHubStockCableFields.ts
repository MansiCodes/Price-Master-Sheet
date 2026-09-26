import { useState } from "react";
import { getQuadSignalCableSizes, QUAD_SIGNAL_STOCK_CABLES } from "@/lib/plant-catalogs";

export function useTodayHubStockCableFields() {
  const [stockKind, setStockKind] = useState<"raw" | "cable">("raw");
  const [stockCable, setStockCable] = useState<string>(QUAD_SIGNAL_STOCK_CABLES[0]);
  const [stockCableOther, setStockCableOther] = useState("");
  const [stockCableSize, setStockCableSize] = useState(
    () => getQuadSignalCableSizes(QUAD_SIGNAL_STOCK_CABLES[0])[0] ?? "Other",
  );
  const [stockCableSizeOther, setStockCableSizeOther] = useState("");
  return {
    stockKind,
    setStockKind,
    stockCable,
    setStockCable,
    stockCableOther,
    setStockCableOther,
    stockCableSize,
    setStockCableSize,
    stockCableSizeOther,
    setStockCableSizeOther,
  };
}
