import { useState } from "react";
import type { StockWipSalesLine } from "@/components/today/today-hub-model";

export function useTodayHubStockWipFields() {
  const [stockProcessQtys, setStockProcessQtys] = useState<Record<string, string>>({});
  const [stockWipOpening, setStockWipOpening] = useState<Record<string, string>>({});
  const [stockOpeningEditable, setStockOpeningEditable] = useState(false);
  /** True while quad-wip-context is loading for the selected cable+size. */
  const [stockWipContextLoading, setStockWipContextLoading] = useState(false);
  const [stockWipSalesKm, setStockWipSalesKm] = useState(0);
  const [stockWipSalesLines, setStockWipSalesLines] = useState<StockWipSalesLine[]>([]);
  return {
    stockProcessQtys,
    setStockProcessQtys,
    stockWipOpening,
    setStockWipOpening,
    stockOpeningEditable,
    setStockOpeningEditable,
    stockWipContextLoading,
    setStockWipContextLoading,
    stockWipSalesKm,
    setStockWipSalesKm,
    stockWipSalesLines,
    setStockWipSalesLines,
  };
}
