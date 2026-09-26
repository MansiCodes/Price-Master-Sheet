import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import { useTodayHubCatalogBases } from "@/components/today/hub/useTodayHubCatalogBases";
import { useTodayHubCustomCatalogs } from "@/components/today/hub/useTodayHubCustomCatalogs";
import { useTodayHubPartyOptions } from "@/components/today/hub/useTodayHubPartyOptions";
import { useTodayHubLineOptions } from "@/components/today/hub/useTodayHubLineOptions";
import { useTodayHubUnitOptions } from "@/components/today/hub/useTodayHubUnitOptions";

export function useTodayHubCatalogs(plantCode: string, flags: TodayHubFlags) {
  const bases = useTodayHubCatalogBases(plantCode);
  const custom = useTodayHubCustomCatalogs();
  const party = useTodayHubPartyOptions(bases, custom);
  const lines = useTodayHubLineOptions(flags, bases, custom);
  const units = useTodayHubUnitOptions(flags, bases, custom);
  return { ...bases, ...custom, ...party, ...lines, ...units };
}

export type TodayHubCatalogs = ReturnType<typeof useTodayHubCatalogs>;
