import { useState } from "react";
import { STOCK_CATEGORIES, type PvcStockEntryType } from "@/lib/plant-catalogs";

export function useTodayHubStockMetaFields() {
  const [stockCategory, setStockCategory] = useState<(typeof STOCK_CATEGORIES)[number]>("RM");
  const [stockPurchaseRate, setStockPurchaseRate] = useState<number | null>(null);
  const [stockPurchaseRateLoading, setStockPurchaseRateLoading] = useState(false);
  const [stockNotes, setStockNotes] = useState("");
  const [stockType, setStockType] = useState<PvcStockEntryType>("closing");
  const [stockPhotos, setStockPhotos] = useState<string[]>([]);
  return {
    stockCategory,
    setStockCategory,
    stockPurchaseRate,
    setStockPurchaseRate,
    stockPurchaseRateLoading,
    setStockPurchaseRateLoading,
    stockNotes,
    setStockNotes,
    stockType,
    setStockType,
    stockPhotos,
    setStockPhotos,
  };
}
