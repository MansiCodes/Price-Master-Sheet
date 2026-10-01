import { useState } from "react";
import type {
  StockCallPutupItem,
  StockDispatchPendingItem,
  StockSaleItem,
} from "@/components/today/today-hub-model";

export const EMPTY_STOCK_SALE_ITEM: StockSaleItem = {
  invoiceNo: "",
  date: "",
  partyName: "",
  rate: "",
  quantity: "",
  gstPercent: "",
};

export function useTodayHubStockCallFields() {
  const [stockCallPutup, setStockCallPutup] = useState("");
  const [stockPutupDate, setStockPutupDate] = useState("");
  const [stockPartyName, setStockPartyName] = useState("");
  const [stockDispatchPending, setStockDispatchPending] = useState("");
  const [stockDispatchParty, setStockDispatchParty] = useState("");
  const [stockCallPutupItems, setStockCallPutupItems] = useState<StockCallPutupItem[]>([
    { qty: "", date: "", partyName: "" },
  ]);
  const [stockDispatchPendingItems, setStockDispatchPendingItems] = useState<
    StockDispatchPendingItem[]
  >([{ qty: "", partyName: "" }]);
  const [stockSaleItems, setStockSaleItems] = useState<StockSaleItem[]>([
    { ...EMPTY_STOCK_SALE_ITEM },
  ]);
  const [stockSaleHints, setStockSaleHints] = useState<StockSaleItem[]>([]);
  const [stockDispatchSettledKm, setStockDispatchSettledKm] = useState(0);
  const [stockDispatchSettledItems, setStockDispatchSettledItems] = useState<
    StockDispatchPendingItem[]
  >([]);
  const [stockDispatchLoadedKm, setStockDispatchLoadedKm] = useState(0);
  const [stockDispatchLoadedItems, setStockDispatchLoadedItems] = useState<
    StockDispatchPendingItem[]
  >([]);
  return {
    stockCallPutup,
    setStockCallPutup,
    stockPutupDate,
    setStockPutupDate,
    stockPartyName,
    setStockPartyName,
    stockDispatchPending,
    setStockDispatchPending,
    stockDispatchParty,
    setStockDispatchParty,
    stockCallPutupItems,
    setStockCallPutupItems,
    stockDispatchPendingItems,
    setStockDispatchPendingItems,
    stockSaleItems,
    setStockSaleItems,
    stockSaleHints,
    setStockSaleHints,
    stockDispatchSettledKm,
    setStockDispatchSettledKm,
    stockDispatchSettledItems,
    setStockDispatchSettledItems,
    stockDispatchLoadedKm,
    setStockDispatchLoadedKm,
    stockDispatchLoadedItems,
    setStockDispatchLoadedItems,
  };
}
