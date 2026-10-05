import type {
  StockCallPutupItem,
  StockDispatchPendingItem,
  StockSaleItem,
} from "@/components/today/today-hub-model";
import { liveDispatchLock } from "@/lib/stock-production-status/dispatch-history";

export function mappedCallPutupItems(items: StockCallPutupItem[]) {
  return items
    .map((item) => ({
      qty: item.qty.trim() ? Number(item.qty.trim()) || item.qty.trim() : 0,
      date: item.date.trim() || undefined,
      partyName: item.partyName.trim() || undefined,
    }))
    .filter((item) => Boolean(item.qty) || Boolean(item.date) || Boolean(item.partyName));
}

export function mergeCallPutupItems(
  loaded: StockCallPutupItem[],
  form: StockCallPutupItem[],
) {
  return mappedCallPutupItems([...loaded, ...form]);
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
  const { stockDispatchPendingItems, stockDispatchParty } = args;
  const mapped = mappedDispatchItems(stockDispatchPendingItems);
  if (mapped.length === 0 || formDispatchKm(stockDispatchPendingItems) <= 0) {
    return {};
  }
  return {
    ...(stockDispatchPendingItems[0]?.partyName?.trim()
      ? { dispatchParty: stockDispatchPendingItems[0].partyName.trim() }
      : stockDispatchParty.trim()
      ? { dispatchParty: stockDispatchParty.trim() }
      : {}),
    ...(stockDispatchPendingItems[0]?.qty?.trim()
      ? { dispatchPending: Number(stockDispatchPendingItems[0].qty.trim()) || undefined }
      : {}),
  };
}

export function mappedSaleItems(items: StockSaleItem[]) {
  return items
    .map((item) => ({
      invoiceNo: item.invoiceNo.trim() || undefined,
      date: item.date.trim() || undefined,
      partyName: item.partyName.trim() || undefined,
      rate: item.rate.trim() ? Number(item.rate.trim()) || item.rate.trim() : undefined,
      quantity: item.quantity.trim()
        ? Number(item.quantity.trim()) || item.quantity.trim()
        : undefined,
      gstPercent: item.gstPercent.trim()
        ? Number(item.gstPercent.trim()) || item.gstPercent.trim()
        : undefined,
    }))
    .filter(
      (item) =>
        Boolean(item.invoiceNo) ||
        Boolean(item.date) ||
        Boolean(item.partyName) ||
        item.rate != null ||
        item.quantity != null ||
        item.gstPercent != null,
    );
}

export function formDispatchKm(
  items: StockDispatchPendingItem[],
  fallback?: number,
) {
  const fromItems = mappedDispatchItems(items).reduce((sum, item) => {
    const q = Number(item.qty);
    return sum + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);
  const fb = Number(fallback) || 0;
  return Math.max(fromItems, fb);
}

export function lockDispatchHistory(args: {
  formItems: StockDispatchPendingItem[];
  prevSettledKm: number;
  loadedKm: number;
  prevSettledItems: Array<{ qty: number | string; partyName?: string }>;
  loadedItems: Array<{ qty: number | string; partyName?: string }>;
}) {
  const pending = mappedDispatchItems(args.formItems);
  const locked = liveDispatchLock(pending, args.loadedItems, args.prevSettledItems);
  const settledKm = locked.settledKm;
  const settledItems = locked.settledItems.map((item) => ({
    qty: item.qty,
    partyName: item.dispatchParty,
  }));
  return {
    settledKm,
    settledItems,
    pendingItems: formDispatchKm(args.formItems) <= 0 ? [] : pending,
  };
}
