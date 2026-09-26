import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import { HubStockQuadRaw } from "@/components/today/hub/HubStockQuadRaw";
import { HubStockQuadHeader } from "@/components/today/hub/HubStockQuadHeader";
import { HubStockQuadWip } from "@/components/today/hub/HubStockQuadWip";
import { HubStockRaw } from "@/components/today/hub/HubStockRaw";
import { HubStockUpcast } from "@/components/today/hub/HubStockUpcast";
import { HubStockQtyValue } from "@/components/today/hub/HubStockQtyValue";
import { HubStockNotes } from "@/components/today/hub/HubStockNotes";
import { HubStockTotalValue, stockQtyGridClass } from "@/components/today/hub/HubStockTotalValue";

export function HubStockKindFields({ vm }: { vm: TodayHubVm }) {
  const { isQuad, stockKind, quadCableProcessFields } = bindStockLocals(vm);
  if (!isQuad) return <HubStockRaw vm={vm} />;
  if (stockKind === "raw") return <HubStockQuadRaw vm={vm} />;
  return (
    <>
      <HubStockQuadHeader vm={vm} />
      {quadCableProcessFields.length > 0 ? <HubStockQuadWip vm={vm} /> : null}
    </>
  );
}

export function HubStockQtyBlock({ vm }: { vm: TodayHubVm }) {
  const { isQuad, isUpcast, stockKind, quadCableProcessFields } = bindStockLocals(vm);
  if (isQuad && stockKind === "cable" && quadCableProcessFields.length > 0) return null;
  return (
    <div className={stockQtyGridClass(isQuad, stockKind, quadCableProcessFields.length)}>
      {isUpcast ? <HubStockUpcast vm={vm} /> : <HubStockQtyValue vm={vm} />}
      <HubStockTotalValue vm={vm} />
    </div>
  );
}

export function HubStockFields({ vm }: { vm: TodayHubVm }) {
  return (
    <>
      <HubStockKindFields vm={vm} />
      <HubStockQtyBlock vm={vm} />
      <HubStockNotes vm={vm} />
    </>
  );
}
