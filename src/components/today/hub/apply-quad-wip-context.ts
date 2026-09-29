import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import { extrasFromPoolContributions } from "@/components/today/hub/add-insulation-extra";
import { EMPTY_STOCK_SALE_ITEM } from "@/components/today/hub/useTodayHubStockCallFields";
import { isSignallingCableName } from "@/lib/quad-signal-wip";
import { liveDispatchLock } from "@/lib/stock-production-status/dispatch-history";

type QuadWipSetters = Pick<
  TodayHubStockState,
  | "setStockWipOpening"
  | "setStockOpeningEditable"
  | "setStockWipContextLoading"
  | "setStockWipSalesKm"
  | "setStockWipSalesLines"
  | "setStockCallPutup"
  | "setStockPutupDate"
  | "setStockPartyName"
  | "setStockDispatchPending"
  | "setStockDispatchParty"
  | "setStockCallPutupItems"
  | "setStockDispatchPendingItems"
  | "setStockSaleItems"
  | "setStockDispatchSettledKm"
  | "setStockDispatchSettledItems"
  | "setStockDispatchLoadedKm"
  | "setStockDispatchLoadedItems"
  | "setStockLengthOptions"
  | "setStockLengthFactor"
  | "setStockInsulationExtras"
  | "setStockInsulationExtrasOpen"
  | "setStockProcessQtys"
>;

export function resetQuadWipFields(s: QuadWipSetters) {
  s.setStockWipOpening({});
  s.setStockProcessQtys({});
  s.setStockOpeningEditable(false);
  s.setStockWipContextLoading(false);
  s.setStockWipSalesKm(0);
  s.setStockWipSalesLines([]);
  s.setStockCallPutup("");
  s.setStockPutupDate("");
  s.setStockPartyName("");
  s.setStockDispatchPending("");
  s.setStockDispatchParty("");
  s.setStockCallPutupItems([{ qty: "", date: "", partyName: "" }]);
  s.setStockDispatchPendingItems([{ qty: "", partyName: "" }]);
  s.setStockSaleItems([{ ...EMPTY_STOCK_SALE_ITEM }]);
  s.setStockDispatchSettledKm(0);
  s.setStockDispatchSettledItems([]);
  s.setStockDispatchLoadedKm(0);
  s.setStockDispatchLoadedItems([]);
  s.setStockLengthOptions([]);
  s.setStockLengthFactor(null);
  s.setStockInsulationExtras([]);
  s.setStockInsulationExtrasOpen(false);
}

export function resetQuadWipFieldsOnError(s: QuadWipSetters) {
  s.setStockWipOpening({});
  s.setStockProcessQtys({});
  s.setStockOpeningEditable(false);
  s.setStockWipSalesKm(0);
  s.setStockWipSalesLines([]);
  s.setStockCallPutup("");
  s.setStockPutupDate("");
  s.setStockPartyName("");
  s.setStockDispatchPending("");
  s.setStockDispatchParty("");
  s.setStockCallPutupItems([{ qty: "", date: "", partyName: "" }]);
  s.setStockDispatchPendingItems([{ qty: "", partyName: "" }]);
  s.setStockSaleItems([{ ...EMPTY_STOCK_SALE_ITEM }]);
  s.setStockDispatchSettledKm(0);
  s.setStockDispatchSettledItems([]);
  s.setStockDispatchLoadedKm(0);
  s.setStockDispatchLoadedItems([]);
  s.setStockInsulationExtras([]);
  s.setStockInsulationExtrasOpen(false);
  s.setStockWipContextLoading(false);
}

function applyCallPutupFromMeta(
  s: QuadWipSetters,
  meta: {
    callPutup: string;
    putupDate: string;
    partyName: string;
    callPutupItems?: Array<{ qty: number | string; date?: string; partyName?: string }>;
  } | null,
) {
  const rawPutups = meta?.callPutupItems;
  if (Array.isArray(rawPutups) && rawPutups.length > 0) {
    s.setStockCallPutupItems(rawPutups.map((p) => ({
      qty: p.qty != null ? String(p.qty) : "",
      date: p.date ?? "",
      partyName: p.partyName ?? "",
    })));
  } else if (meta?.callPutup || meta?.putupDate || meta?.partyName) {
    s.setStockCallPutupItems([{
      qty: meta.callPutup ?? "",
      date: meta.putupDate ?? "",
      partyName: meta.partyName ?? "",
    }]);
  } else {
    s.setStockCallPutupItems([{ qty: "", date: "", partyName: "" }]);
  }
}

function applyDispatchFromMeta(
  s: QuadWipSetters,
  meta: {
    dispatchPending: string;
    dispatchParty: string;
    dispatchPendingItems?: Array<{ qty: number | string; partyName?: string }>;
    dispatchSettledKm?: number;
    dispatchSettledItems?: Array<{ qty: number | string; partyName?: string }>;
  } | null,
) {
  const rawDispatches = meta?.dispatchPendingItems;
  let loadedItems: Array<{ qty: string; partyName: string }> = [];
  if (Array.isArray(rawDispatches) && rawDispatches.length > 0) {
    loadedItems = rawDispatches.map((d) => ({
      qty: d.qty != null ? String(d.qty) : "",
      partyName: d.partyName ?? "",
    }));
    s.setStockDispatchPendingItems(loadedItems);
  } else if (meta?.dispatchPending || meta?.dispatchParty) {
    loadedItems = [{
      qty: meta.dispatchPending ?? "",
      partyName: meta.dispatchParty ?? "",
    }];
    s.setStockDispatchPendingItems(loadedItems);
  } else {
    s.setStockDispatchPendingItems([{ qty: "", partyName: "" }]);
  }
  const formKm = loadedItems.reduce((sum, d) => {
    const q = Number(d.qty);
    return sum + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);
  const locked = liveDispatchLock(
    loadedItems,
    loadedItems,
    Array.isArray(meta?.dispatchSettledItems) ? meta.dispatchSettledItems : [],
  );
  const settledItems = locked.settledItems.map((d) => ({
    qty: String(d.qty),
    partyName: d.dispatchParty,
  }));
  s.setStockDispatchLoadedKm(formKm);
  s.setStockDispatchLoadedItems(loadedItems);
  s.setStockDispatchSettledKm(locked.settledKm);
  s.setStockDispatchSettledItems(settledItems);
}

function applySaleFromMeta(
  s: QuadWipSetters,
  meta: {
    saleItems?: Array<{
      invoiceNo?: string;
      date?: string;
      partyName?: string;
      rate?: number | string;
      quantity?: number | string;
      gstPercent?: number | string;
    }>;
  } | null,
) {
  const raw = meta?.saleItems;
  if (Array.isArray(raw) && raw.length > 0) {
    s.setStockSaleItems(raw.map((row) => ({
      invoiceNo: row.invoiceNo ?? "",
      date: row.date ?? "",
      partyName: row.partyName ?? "",
      rate: row.rate != null ? String(row.rate) : "",
      quantity: row.quantity != null ? String(row.quantity) : "",
      gstPercent: row.gstPercent != null ? String(row.gstPercent) : "",
    })));
    return;
  }
  s.setStockSaleItems([{ ...EMPTY_STOCK_SALE_ITEM }]);
}

function applyLengthOptions(
  s: QuadWipSetters,
  variant: {
    lengthFactor: number;
    drumLabel?: string;
    lengthOptions?: Array<{ label: string; lengthFactor: number }>;
  } | null,
) {
  if (!variant) {
    s.setStockLengthOptions([]);
    s.setStockLengthFactor(null);
    return;
  }
  const opts =
    variant.lengthOptions && variant.lengthOptions.length > 0
      ? variant.lengthOptions
      : [{ label: variant.drumLabel || "Default", lengthFactor: variant.lengthFactor }];
  s.setStockLengthOptions(opts);
  s.setStockLengthFactor((prev) => {
    if (prev != null && opts.some((o) => o.lengthFactor === prev)) return prev;
    return opts[0]?.lengthFactor ?? variant.lengthFactor;
  });
}

export type QuadWipContextData = {
  opening: Record<string, number>;
  openingFromDate: string | null;
  openingEditable?: boolean;
  salesKm: number;
  sales: TodayHubStockState["stockWipSalesLines"];
  variant: {
    coreCount: number;
    lengthFactor: number;
    factorConfirmed: boolean;
    drumLabel?: string;
    factorAmbiguous?: boolean;
    lengthOptions?: Array<{ label: string; lengthFactor: number }>;
  } | null;
  stockMeta: {
    callPutup: string;
    putupDate: string;
    partyName: string;
    dispatchPending: string;
    dispatchParty: string;
    callPutupItems?: Array<{ qty: number | string; date?: string; partyName?: string }>;
    dispatchPendingItems?: Array<{ qty: number | string; partyName?: string }>;
    dispatchSettledKm?: number;
    dispatchSettledItems?: Array<{ qty: number | string; partyName?: string }>;
    saleItems?: Array<{
      invoiceNo?: string;
      date?: string;
      partyName?: string;
      rate?: number | string;
      quantity?: number | string;
      gstPercent?: number | string;
    }>;
    opening?: Record<string, number>;
    production?: Record<string, number>;
  } | null;
  cable?: string;
  size?: string;
  production?: Record<string, number>;
  insulationContributions?: Array<{
    size: string;
    layingProduced: number;
    lengthFactor: number;
    coreCount?: number;
    consumed?: number;
  }>;
};

function applyQtyMaps(
  s: QuadWipSetters,
  data: QuadWipContextData,
) {
  const savedOpen = data.stockMeta?.opening;
  const openingSrc =
    savedOpen && Object.keys(savedOpen).length > 0 ? savedOpen : data.opening;
  const openingStrings: Record<string, string> = {};
  for (const [key, raw] of Object.entries(openingSrc ?? {})) {
    const n = Number(raw);
    if (Number.isFinite(n)) openingStrings[key] = String(n);
  }
  s.setStockWipOpening(openingStrings);
  const savedProd = data.stockMeta?.production;
  const productionSrc =
    savedProd && Object.keys(savedProd).length > 0 ? savedProd : data.production;
  const productionStrings: Record<string, string> = {};
  const productionAliases: Record<string, string> = {
    Outer: "Outer Sheath",
    Inner: "Inner Sheath",
    Armoring: "Armouring",
    "outer sheath": "Outer Sheath",
    "inner sheath": "Inner Sheath",
  };
  for (const [key, raw] of Object.entries(productionSrc ?? {})) {
    if (key.trim().toLowerCase() === "insulation") continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    productionStrings[key] = String(n);
    const canon = productionAliases[key] ?? productionAliases[key.trim().toLowerCase()];
    if (canon && canon.trim().toLowerCase() !== "insulation") {
      productionStrings[canon] = String(n);
    }
  }
  s.setStockProcessQtys(productionStrings);
}

export function applyQuadWipContextData(s: QuadWipSetters, data: QuadWipContextData) {
  applyQtyMaps(s, data);
  s.setStockOpeningEditable(Boolean(data.openingEditable));
  s.setStockWipSalesKm(0);
  s.setStockWipSalesLines(data.sales ?? []);
  applyLengthOptions(s, data.variant);
  const meta = data.stockMeta;
  s.setStockCallPutup(meta?.callPutup ?? "");
  s.setStockPutupDate(meta?.putupDate ?? "");
  s.setStockPartyName(meta?.partyName ?? "");
  s.setStockDispatchPending(meta?.dispatchPending ?? "");
  s.setStockDispatchParty(meta?.dispatchParty ?? "");
  applyCallPutupFromMeta(s, meta);
  applyDispatchFromMeta(s, meta);
  applySaleFromMeta(s, meta);
  const cable = data.cable ?? "";
  const size = data.size ?? "";
  if (isSignallingCableName(cable)) {
    s.setStockInsulationExtras(
      extrasFromPoolContributions("Signalling Cable", size, data.insulationContributions ?? []),
    );
  } else {
    s.setStockInsulationExtras([]);
  }
  s.setStockInsulationExtrasOpen(false);
  s.setStockWipContextLoading(false);
}

export type { QuadWipSetters };
