import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import { extrasFromPoolContributions } from "@/components/today/hub/add-insulation-extra";
import { isSignallingCableName } from "@/lib/quad-signal-wip";

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
  } | null,
) {
  const rawDispatches = meta?.dispatchPendingItems;
  if (Array.isArray(rawDispatches) && rawDispatches.length > 0) {
    s.setStockDispatchPendingItems(rawDispatches.map((d) => ({
      qty: d.qty != null ? String(d.qty) : "",
      partyName: d.partyName ?? "",
    })));
  } else if (meta?.dispatchPending || meta?.dispatchParty) {
    s.setStockDispatchPendingItems([{
      qty: meta.dispatchPending ?? "",
      partyName: meta.dispatchParty ?? "",
    }]);
  } else {
    s.setStockDispatchPendingItems([{ qty: "", partyName: "" }]);
  }
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

export function applyQuadWipContextData(s: QuadWipSetters, data: QuadWipContextData) {
  const openingStrings: Record<string, string> = {};
  for (const [key, raw] of Object.entries(data.opening ?? {})) {
    const n = Number(raw);
    if (Number.isFinite(n)) openingStrings[key] = String(n);
  }
  s.setStockWipOpening(openingStrings);
  const productionStrings: Record<string, string> = {};
  const productionAliases: Record<string, string> = {
    Outer: "Outer Sheath",
    Inner: "Inner Sheath",
    Armoring: "Armouring",
    "outer sheath": "Outer Sheath",
    "inner sheath": "Inner Sheath",
  };
  for (const [key, raw] of Object.entries(data.production ?? {})) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    productionStrings[key] = String(n);
    const canon = productionAliases[key] ?? productionAliases[key.trim().toLowerCase()];
    if (canon) productionStrings[canon] = String(n);
  }
  s.setStockProcessQtys(productionStrings);
  s.setStockOpeningEditable(Boolean(data.openingEditable));
  s.setStockWipSalesKm(Number(data.salesKm) || 0);
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
