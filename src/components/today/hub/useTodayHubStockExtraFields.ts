import { useState } from "react";
import type {
  StockInsulationExtra,
  StockSingleQuadExtra,
} from "@/components/today/today-hub-model";

export function useTodayHubStockExtraFields() {
  const [stockLengthOptions, setStockLengthOptions] = useState<
    Array<{ label: string; lengthFactor: number }>
  >([]);
  const [stockLengthFactor, setStockLengthFactor] = useState<number | null>(null);
  const [stockInsulationExtras, setStockInsulationExtras] = useState<StockInsulationExtra[]>([]);
  const [stockSingleQuadExtras, setStockSingleQuadExtras] = useState<StockSingleQuadExtra[]>([]);
  return {
    stockLengthOptions,
    setStockLengthOptions,
    stockLengthFactor,
    setStockLengthFactor,
    stockInsulationExtras,
    setStockInsulationExtras,
    stockSingleQuadExtras,
    setStockSingleQuadExtras,
  };
}
