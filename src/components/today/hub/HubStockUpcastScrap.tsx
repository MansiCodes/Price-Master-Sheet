import { DecimalInput } from "@/components/ui/DecimalInput";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubStockUpcastScrapInputs({ vm }: { vm: TodayHubVm }) {
  const {
    upcastTotalScrapWeight, setUpcastTotalScrapWeight, upcastPettyQty, setUpcastPettyQty,
    upcastWeightPerPetty, setUpcastWeightPerPetty, upcastBurningLossWeight, setUpcastBurningLossWeight,
  } = bindStockLocals(vm);
  return (
    <div className="form-grid four" style={{ gap: "10px" }}>
      <div className="field">
        <label htmlFor="upcast-tot-scrap">Total Raw Scrap Wt (KGS)</label>
        <DecimalInput id="upcast-tot-scrap" value={upcastTotalScrapWeight} onChange={setUpcastTotalScrapWeight} placeholder="e.g. 9000" />
      </div>
      <div className="field">
        <label htmlFor="upcast-petty-qty">Petty Qty (Bundles)</label>
        <DecimalInput id="upcast-petty-qty" value={upcastPettyQty} onChange={setUpcastPettyQty} placeholder="e.g. 5" />
      </div>
      <div className="field">
        <label htmlFor="upcast-petty-unit-wt">Weight per Petty (KGS)</label>
        <DecimalInput id="upcast-petty-unit-wt" value={upcastWeightPerPetty} onChange={setUpcastWeightPerPetty} placeholder="e.g. 1799" />
      </div>
      <div className="field">
        <label htmlFor="upcast-burn-loss">Burning Loss Wt (KGS)</label>
        <DecimalInput id="upcast-burn-loss" value={upcastBurningLossWeight} onChange={setUpcastBurningLossWeight} placeholder="e.g. 20" />
      </div>
    </div>
  );
}

export function HubStockUpcastScrap({ vm }: { vm: TodayHubVm }) {
  return (
    <div style={{ background: "#f0fdfa", padding: "14px", borderRadius: "8px", border: "1px solid #99f6e4" }}>
      <h4 style={{ margin: "0 0 10px 0", fontSize: "0.88rem", fontWeight: 700, color: "#0d9488" }}>
        2. Scrap Sorting & Burning Stage
      </h4>
      <HubStockUpcastScrapInputs vm={vm} />
      <HubStockUpcastScrapSummary vm={vm} />
    </div>
  );
}

export function HubStockUpcastScrapSummary({ vm }: { vm: TodayHubVm }) {
  const {
    upcastPettyQty, upcastWeightPerPetty, upcastTotalPettyWeight, upcastTotalScrapWeight,
    upcastSortingLossWeight, upcastWeightAfterBurning,
  } = bindStockLocals(vm);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", marginTop: "10px", borderTop: "1px solid #ccfbf1", fontSize: "0.82rem", color: "#115e59" }}>
      <span>
        Total Petty Wt = {upcastPettyQty || 0} petty × {upcastWeightPerPetty || 0} kg = <strong>{upcastTotalPettyWeight.toLocaleString("en-IN")} KGS</strong>
      </span>
      <span style={{ background: "#ccfbf1", color: "#0f766e", padding: "2px 8px", borderRadius: "6px", fontWeight: 700 }}>
        Sorting Loss = {upcastTotalScrapWeight || 0} − {upcastTotalPettyWeight} = <strong>{upcastSortingLossWeight.toLocaleString("en-IN")} KGS</strong> (Auto-calculated)
      </span>
      <span>
        Available for Casting = <strong>{upcastWeightAfterBurning.toLocaleString("en-IN")} KGS</strong>
      </span>
    </div>
  );
}
