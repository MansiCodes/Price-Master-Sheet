import { useState } from "react";
import type {
  StockCallPutupItem,
  StockDispatchPendingItem,
} from "@/components/today/today-hub-model";

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
  };
}
