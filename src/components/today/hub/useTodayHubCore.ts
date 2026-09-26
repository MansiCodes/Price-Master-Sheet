import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { TodayHubProps } from "@/components/today/today-hub-model";
import { useTodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import { useTodayHubStores } from "@/components/today/hub/useTodayHubStores";
import { useTodayHubQuadLayer } from "@/components/today/hub/useTodayHubQuadLayer";
import { useTodayHubExpense } from "@/components/today/hub/useTodayHubExpense";
import { useTodayHubMisc } from "@/components/today/hub/useTodayHubMisc";
import { useStockTotalValue } from "@/components/today/hub/useStockTotalValue";
import { buildTodayHubVm } from "@/components/today/hub/build-today-hub-vm";

export function useTodayHubCore(props: TodayHubProps) {
  const router = useRouter();
  const t = useTranslations("today");
  const tCommon = useTranslations("common");
  const flags = useTodayHubFlags(props.plantCode, props.userRole ?? "", props.canAccessStock ?? false);
  const stores = useTodayHubStores(props, flags, t);
  const quad = useTodayHubQuadLayer(flags, stores.catalogs, stores.stock, stores.session, props.plantId);
  const expense = useTodayHubExpense(
    props.plantCode, flags, stores.session.kind, stores.session.entryDate, props.plantId, stores.purchase.purchaseLines,
  );
  const misc = useTodayHubMisc();
  const stockTotalValue = useStockTotalValue(stores.stock.stockQty, stores.stock.stockRate);
  const vm = buildTodayHubVm(props, flags, stores, quad, expense, misc, stockTotalValue);
  return { vm, t, tCommon, router };
}
