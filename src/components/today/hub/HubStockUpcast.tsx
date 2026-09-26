import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { HubStockUpcastBalance } from "@/components/today/hub/HubStockUpcastBalance";
import { HubStockUpcastScrap } from "@/components/today/hub/HubStockUpcastScrap";
import { HubStockUpcastOutput } from "@/components/today/hub/HubStockUpcastOutput";

export function HubStockUpcast({ vm }: { vm: TodayHubVm }) {
  return (
    <div className="field field--wide" style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* 1. Stock Ledger: Opening + Incoming - Outward = Closing */}
      <HubStockUpcastBalance vm={vm} />
      {/* 2. Scrap Sorting & Burning Stage */}
      <HubStockUpcastScrap vm={vm} />
      {/* 3. Production Output Breakdown (Rod & Wire 3 sizes) */}
      <HubStockUpcastOutput vm={vm} />
    </div>
  );
}
