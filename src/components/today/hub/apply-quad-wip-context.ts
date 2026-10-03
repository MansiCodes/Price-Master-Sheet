import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import { extrasFromPoolContributions } from "@/components/today/hub/add-insulation-extra";
import { EMPTY_STOCK_SALE_ITEM } from "@/components/today/hub/useTodayHubStockCallFields";
import type { StockSaleItem } from "@/components/today/today-hub-model";
import { isSignallingCableName } from "@/lib/quad-signal-wip";
import { liveDispatchLock } from "@/lib/stock-production-status/dispatch-history";

type QuadWipSetters = Pick<
  TodayHubStockState,
  | "setStockWipOpening"
  | "setStockOpeningEditable"
  | "setStockWipContextLoading"
  | "setStockWipSalesKm"
  | "setStockOrderPutupKm"
  | "setStockWipSalesLines"
  | "setStockCallPutup"
  | "setStockPutupDate"
  | "setStockPartyName"
  | "setStockDispatchPending"
  | "setStockDispatchParty"
  | "setStockCallPutupItems"
  | "setStockDispatchPendingItems"
  | "setStockSaleItems"
  | "setStockSaleHints"
  | "setStockDispatchSettledKm"
  | "setStockDispatchSettledItems"
  | "setStockDispatchLoadedKm"
  | "setStockDispatchLoadedItems"
  | "setStockLengthOptions"
  | "setStockLengthFactor"
  | "setStockInsulationExtras"
  | "setStockInsulationExtrasOpen"
  | "setStockProcessQtys"
  | "setStockProcessHints"
>;

export function resetQuadWipFields(s: QuadWipSetters) {
  s.setStockWipOpening({});
  s.setStockProcessQtys({});
  s.setStockProcessHints({});
  s.setStockOpeningEditable(false);
  s.setStockWipContextLoading(false);
  s.setStockWipSalesKm(0);
  s.setStockOrderPutupKm(0);
  s.setStockWipSalesLines([]);
  s.setStockCallPutup("");
  s.setStockPutupDate("");
  s.setStockPartyName("");
  s.setStockDispatchPending("");
  s.setStockDispatchParty("");
  s.setStockCallPutupItems([{ qty: "", date: "", partyName: "" }]);
  s.setStockDispatchPendingItems([{ qty: "", partyName: "" }]);
  s.setStockSaleItems([{ ...EMPTY_STOCK_SALE_ITEM }]);
  s.setStockSaleHints([]);
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
  s.setStockProcessHints({});
  s.setStockOpeningEditable(false);
  s.setStockWipSalesKm(0);
  s.setStockOrderPutupKm(0);
  s.setStockWipSalesLines([]);
  s.setStockCallPutup("");
  s.setStockPutupDate("");
  s.setStockPartyName("");
  s.setStockDispatchPending("");
  s.setStockDispatchParty("");
  s.setStockCallPutupItems([{ qty: "", date: "", partyName: "" }]);
  s.setStockDispatchPendingItems([{ qty: "", partyName: "" }]);
  s.setStockSaleItems([{ ...EMPTY_STOCK_SALE_ITEM }]);
  s.setStockSaleHints([]);
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

function saleHintFromMeta(row: {
  invoiceNo?: string;
  date?: string;
  partyName?: string;
  rate?: number | string;
  quantity?: number | string;
  gstPercent?: number | string;
}): StockSaleItem {
  return {
    invoiceNo: String(row.invoiceNo ?? "").trim(),
    date: String(row.date ?? "").trim(),
    partyName: String(row.partyName ?? "").trim(),
    rate: row.rate != null && String(row.rate).trim() !== "" ? String(row.rate) : "",
    quantity: row.quantity != null && String(row.quantity).trim() !== "" ? String(row.quantity) : "",
    gstPercent:
      row.gstPercent != null && String(row.gstPercent).trim() !== "" ? String(row.gstPercent) : "",
  };
}

function saleHintHasValue(row: StockSaleItem) {
  return Boolean(
    row.invoiceNo || row.date || row.partyName || row.rate || row.quantity || row.gstPercent,
  );
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
  const hints =
    Array.isArray(raw) && raw.length > 0
      ? raw.map(saleHintFromMeta).filter(saleHintHasValue)
      : [];
  s.setStockSaleHints(hints);
  s.setStockSaleItems(
    hints.length > 0
      ? hints.map(() => ({ ...EMPTY_STOCK_SALE_ITEM }))
      : [{ ...EMPTY_STOCK_SALE_ITEM }],
  );
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
  putupKm?: number;
};

function isInsulationKey(key: string) {
  return key.trim().toLowerCase() === "insulation";
}

function insulationQty(
  maps: Array<Record<string, number> | undefined | null>,
): string | null {
  for (const map of maps) {
    if (!map) continue;
    for (const [key, raw] of Object.entries(map)) {
      if (!isInsulationKey(key)) continue;
      const n = Number(raw);
      if (Number.isFinite(n)) return String(n);
    }
  }
  return null;
}

export type ApplyQuadWipOpts = { preserveInsulation?: boolean };

function applyQtyMaps(
  s: QuadWipSetters,
  data: QuadWipContextData,
  opts?: ApplyQuadWipOpts,
) {
  const preserveIns = Boolean(opts?.preserveInsulation);
  const savedOpen = data.stockMeta?.opening;
  const processAliases: Record<string, string> = {
    Outer: "Outer Sheath",
    outer: "Outer Sheath",
    "outer sheath": "Outer Sheath",
    Inner: "Inner Sheath",
    inner: "Inner Sheath",
    "inner sheath": "Inner Sheath",
    Armoring: "Armouring",
    armoring: "Armouring",
  };
  const openingStrings: Record<string, string> = {};
  const putOpening = (map?: Record<string, number> | null) => {
    if (!map) return;
    for (const [key, raw] of Object.entries(map)) {
      if (isInsulationKey(key)) continue;
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      openingStrings[key] = String(n);
      const canon = processAliases[key] ?? processAliases[key.trim().toLowerCase()];
      if (canon) openingStrings[canon] = String(n);
    }
  };
  putOpening(savedOpen);
  putOpening(data.opening);
  const insOpen = insulationQty([data.opening]);
  s.setStockWipOpening((prev) => {
    const next = { ...openingStrings };
    if (preserveIns && prev.Insulation != null && prev.Insulation !== "") {
      next.Insulation = prev.Insulation;
    } else if (insOpen != null) {
      next.Insulation = insOpen;
    }
    return next;
  });
  const productionSrc: Record<string, number> = { ...(data.production ?? {}) };
  const productionStrings: Record<string, string> = {};
  for (const [key, raw] of Object.entries(productionSrc)) {
    if (isInsulationKey(key)) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    productionStrings[key] = String(n);
    const canon = processAliases[key] ?? processAliases[key.trim().toLowerCase()];
    if (canon && !isInsulationKey(canon)) {
      productionStrings[canon] = String(n);
    }
  }
  s.setStockProcessHints(productionStrings);
  s.setStockProcessQtys({});
}

export function applyQuadWipContextData(
  s: QuadWipSetters,
  data: QuadWipContextData,
  opts?: ApplyQuadWipOpts,
) {
  applyQtyMaps(s, data, opts);
  s.setStockOpeningEditable(Boolean(data.openingEditable));
  s.setStockWipSalesKm(0);
  s.setStockOrderPutupKm(Number(data.putupKm) > 0 ? Number(data.putupKm) : 0);
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
  if (!opts?.preserveInsulation) {
    if (isSignallingCableName(cable)) {
      const extras = extrasFromPoolContributions(
        "Signalling Cable",
        data.insulationContributions ?? [],
      );
      s.setStockInsulationExtras(extras);
      s.setStockInsulationExtrasOpen(extras.length > 0);
    } else {
      s.setStockInsulationExtras([]);
      s.setStockInsulationExtrasOpen(false);
    }
  }
  s.setStockWipContextLoading(false);
}

export type { QuadWipSetters };
