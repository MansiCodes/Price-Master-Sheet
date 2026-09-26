import type { TodayHubProps } from "@/components/today/today-hub-model";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import type { useTodayHubStores } from "@/components/today/hub/useTodayHubStores";
import type { useTodayHubQuadLayer } from "@/components/today/hub/useTodayHubQuadLayer";
import type { TodayHubExpense } from "@/components/today/hub/useTodayHubExpense";
import type { TodayHubMisc } from "@/components/today/hub/useTodayHubMisc";

type Stores = ReturnType<typeof useTodayHubStores>;
type Quad = ReturnType<typeof useTodayHubQuadLayer>;

export function buildTodayHubVm(
  props: TodayHubProps,
  flags: TodayHubFlags,
  stores: Stores,
  quad: Quad,
  expense: TodayHubExpense,
  misc: TodayHubMisc,
  stockTotalValue: number | null,
): TodayHubVm {
  return {
    plantId: props.plantId,
    plantName: props.plantName,
    plantCode: props.plantCode,
    date: props.date,
    canEnter: props.canEnter,
    embedded: props.embedded ?? false,
    overlayOnly: props.overlayOnly ?? false,
    kind: stores.session.kind,
    flags,
    catalogs: stores.catalogs,
    purchase: stores.purchase,
    sale: stores.sale,
    stock: stores.stock,
    upcast: stores.upcast,
    expense,
    misc,
    session: stores.session,
    quad: { ...quad, stockTotalValue },
  };
}
