import type {
  StockCallPutupItem,
  StockDispatchPendingItem,
} from "@/components/today/today-hub-model";

export function mappedCallPutupItems(items: StockCallPutupItem[]) {
  return items
    .map((item) => ({
      qty: item.qty.trim() ? Number(item.qty.trim()) || item.qty.trim() : 0,
      date: item.date.trim() || undefined,
      partyName: item.partyName.trim() || undefined,
    }))
    .filter((item) => Boolean(item.qty) || Boolean(item.date) || Boolean(item.partyName));
}

export function mappedDispatchItems(items: StockDispatchPendingItem[]) {
  return items
    .map((item) => ({
      qty: item.qty.trim() ? Number(item.qty.trim()) || item.qty.trim() : 0,
      partyName: item.partyName.trim() || undefined,
    }))
    .filter((item) => Boolean(item.qty) || Boolean(item.partyName));
}

export function callPutupSpreads(args: {
  stockCallPutupItems: StockCallPutupItem[];
  stockCallPutup: string;
  stockPutupDate: string;
  stockPartyName: string;
}) {
  const { stockCallPutupItems, stockCallPutup, stockPutupDate, stockPartyName } = args;
  return {
    ...(stockCallPutupItems[0]?.qty?.trim()
      ? { callPutup: stockCallPutupItems[0].qty.trim() }
      : stockCallPutup.trim()
      ? { callPutup: stockCallPutup.trim() }
      : {}),
    ...(stockCallPutupItems[0]?.date?.trim()
      ? { putupDate: stockCallPutupItems[0].date.trim() }
      : stockPutupDate.trim()
      ? { putupDate: stockPutupDate.trim() }
      : {}),
    ...(stockCallPutupItems[0]?.partyName?.trim()
      ? { partyName: stockCallPutupItems[0].partyName.trim() }
      : stockPartyName.trim()
      ? { partyName: stockPartyName.trim() }
      : {}),
  };
}

export function dispatchSpreads(args: {
  stockDispatchPendingItems: StockDispatchPendingItem[];
  stockDispatchParty: string;
  stockDispatchPending: string;
  dispatchPending: number | undefined;
}) {
  const { stockDispatchPendingItems, stockDispatchParty, dispatchPending } = args;
  return {
    ...(stockDispatchPendingItems[0]?.partyName?.trim()
      ? { dispatchParty: stockDispatchPendingItems[0].partyName.trim() }
      : stockDispatchParty.trim()
      ? { dispatchParty: stockDispatchParty.trim() }
      : {}),
    ...(stockDispatchPendingItems[0]?.qty?.trim()
      ? { dispatchPending: Number(stockDispatchPendingItems[0].qty.trim()) || undefined }
      : dispatchPending != null
      ? { dispatchPending }
      : {}),
  };
}
