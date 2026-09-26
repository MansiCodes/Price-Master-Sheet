import type { EntryKind } from "@/components/today/today-hub-model";
import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import type { TodayHubCatalogs } from "@/components/today/hub/useTodayHubCatalogs";
import type { TodayHubPurchase } from "@/components/today/hub/useTodayHubPurchase";
import type { TodayHubSale } from "@/components/today/hub/useTodayHubSale";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import type { TodayHubUpcast } from "@/components/today/hub/useTodayHubUpcast";
import type { TodayHubExpense } from "@/components/today/hub/useTodayHubExpense";
import type { TodayHubMisc } from "@/components/today/hub/useTodayHubMisc";
import type { TodayHubSession } from "@/components/today/hub/useTodayHubSession";
import type { QuadWipDerived } from "@/components/today/hub/useQuadWipDerived";
import type { WipCalcResult } from "@/lib/quad-signal-wip";

export type TodayHubVm = {
  plantId: string;
  plantName: string;
  plantCode: string;
  date: string;
  canEnter: boolean;
  embedded: boolean;
  overlayOnly: boolean;
  kind: EntryKind;
  flags: TodayHubFlags;
  catalogs: TodayHubCatalogs;
  purchase: TodayHubPurchase;
  sale: TodayHubSale;
  stock: TodayHubStockState;
  upcast: TodayHubUpcast;
  expense: TodayHubExpense;
  misc: TodayHubMisc;
  session: TodayHubSession;
  quad: QuadWipDerived & {
    stockWipCalc: WipCalcResult | null;
    resolvedStockSize: string;
    stockTotalValue: number | null;
  };
};
