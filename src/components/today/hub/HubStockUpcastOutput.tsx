import { DecimalInput } from "@/components/ui/DecimalInput";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubStockUpcastOutput({ vm }: { vm: TodayHubVm }) {
  const {
    upcastRod8mmWeight, setUpcastRod8mmWeight, upcastWire8mmTo1_6mmWeight, setUpcastWire8mmTo1_6mmWeight,
    upcastWire1_6mmWeight, setUpcastWire1_6mmWeight,
  } = bindStockLocals(vm);
  return (
    <div style={{ background: "#f0fdfa", padding: "14px", borderRadius: "8px", border: "1px solid #5eead4" }}>
      <h4 style={{ margin: "0 0 10px 0", fontSize: "0.88rem", fontWeight: 700, color: "#115e59" }}>
        3. Upcast Production Output Breakdown
      </h4>
      <div className="form-grid three" style={{ gap: "10px" }}>
        <div className="field">
          <label htmlFor="upcast-rod-8mm">CC Copper Rod 8mm Wt (KGS)</label>
          <DecimalInput id="upcast-rod-8mm" value={upcastRod8mmWeight} onChange={setUpcastRod8mmWeight} placeholder="e.g. 3000" />
        </div>
        <div className="field">
          <label htmlFor="upcast-wire-8to16">8mm to 1.6mm Wire Wt (KGS)</label>
          <DecimalInput id="upcast-wire-8to16" value={upcastWire8mmTo1_6mmWeight} onChange={setUpcastWire8mmTo1_6mmWeight} placeholder="e.g. 4000" />
        </div>
        <div className="field">
          <label htmlFor="upcast-wire-16">Final 1.6mm Wire Wt (KGS)</label>
          <DecimalInput id="upcast-wire-16" value={upcastWire1_6mmWeight} onChange={setUpcastWire1_6mmWeight} placeholder="e.g. 1970" />
        </div>
      </div>
      <HubStockUpcastOutputSummary vm={vm} />
    </div>
  );
}

export function HubStockUpcastOutputSummary({ vm }: { vm: TodayHubVm }) {
  const { upcastTotalOutputWeight, upcastWeightAfterBurning, upcastCastingLossWeight } = bindStockLocals(vm);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", marginTop: "10px", borderTop: "1px solid #ccfbf1", fontSize: "0.82rem", color: "#0f766e" }}>
      <span>
        Total Production Output = <strong>{upcastTotalOutputWeight.toLocaleString("en-IN")} KGS</strong>
      </span>
      <span style={{ background: "#ccfbf1", color: "#115e59", padding: "2px 8px", borderRadius: "6px", fontWeight: 700 }}>
        Unaccounted Casting Loss = {upcastWeightAfterBurning} − {upcastTotalOutputWeight} = <strong>{upcastCastingLossWeight.toLocaleString("en-IN")} KGS</strong>
      </span>
    </div>
  );
}
