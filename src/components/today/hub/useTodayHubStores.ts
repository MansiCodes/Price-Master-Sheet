import type { TodayHubProps } from "@/components/today/today-hub-model";
import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import { useTodayHubCatalogs } from "@/components/today/hub/useTodayHubCatalogs";
import { useTodayHubSession } from "@/components/today/hub/useTodayHubSession";
import { useTodayHubPurchase } from "@/components/today/hub/useTodayHubPurchase";
import { useTodayHubSale } from "@/components/today/hub/useTodayHubSale";
import { useTodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import { useTodayHubUpcast } from "@/components/today/hub/useTodayHubUpcast";

export function useTodayHubStores(
  props: TodayHubProps,
  flags: TodayHubFlags,
  t: (key: string) => string,
) {
  const { plantCode, date, shiftModules, plantId, canEnter, overlayOnly, externalOpen, onExternalOpenChange } = props;
  const catalogs = useTodayHubCatalogs(plantCode, flags);
  const session = useTodayHubSession(
    flags, date, shiftModules, plantId, canEnter, overlayOnly ?? false, externalOpen, onExternalOpenChange, t,
  );
  const purchase = useTodayHubPurchase(plantCode, flags, catalogs);
  const sale = useTodayHubSale(plantCode);
  const stock = useTodayHubStockState();
  const upcast = useTodayHubUpcast(flags.isUpcast, session.kind, stock.setStockQty);
  return { catalogs, session, purchase, sale, stock, upcast };
}
