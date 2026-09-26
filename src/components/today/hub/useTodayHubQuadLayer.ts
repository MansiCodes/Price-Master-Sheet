import type { TodayHubFlags } from "@/components/today/hub/useTodayHubFlags";
import type { TodayHubCatalogs } from "@/components/today/hub/useTodayHubCatalogs";
import type { TodayHubStockState } from "@/components/today/hub/useTodayHubStockState";
import type { TodayHubSession } from "@/components/today/hub/useTodayHubSession";
import { useQuadWipDerived } from "@/components/today/hub/useQuadWipDerived";
import { useQuadWipContext } from "@/components/today/hub/useQuadWipContext";
import { useQuadWipCalc } from "@/components/today/hub/useQuadWipCalc";
import { useQuadWipEffects } from "@/components/today/hub/useQuadWipEffects";

export function useTodayHubQuadLayer(
  flags: TodayHubFlags,
  catalogs: TodayHubCatalogs,
  stock: TodayHubStockState,
  session: TodayHubSession,
  plantId: string,
) {
  const quadDerived = useQuadWipDerived(flags.isQuad, stock, catalogs);
  useQuadWipContext(flags.isQuad, plantId, session.entryDate, session.shift, stock);
  const stockWipCalc = useQuadWipCalc(flags.isQuad, stock, quadDerived.quadCableProcessFields);
  const { resolvedStockSize } = useQuadWipEffects(
    flags, catalogs, stock, session.kind, plantId, session.entryDate, quadDerived.isSignallingStock,
  );
  return { ...quadDerived, stockWipCalc, resolvedStockSize };
}
