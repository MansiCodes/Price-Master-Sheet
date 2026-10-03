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
  const [stockInsulationExtrasOpen, setStockInsulationExtrasOpen] = useState(false);
  const [stockSingleQuadExtras, setStockSingleQuadExtras] = useState<StockSingleQuadExtra[]>([]);
  const [stockPowerLayingFactor, setStockPowerLayingFactor] = useState("");
  return {
    stockLengthOptions,
    setStockLengthOptions,
    stockLengthFactor,
    setStockLengthFactor,
    stockInsulationExtras,
    setStockInsulationExtras,
    stockInsulationExtrasOpen,
    setStockInsulationExtrasOpen,
    stockSingleQuadExtras,
    setStockSingleQuadExtras,
    stockPowerLayingFactor,
    setStockPowerLayingFactor,
  };
}
