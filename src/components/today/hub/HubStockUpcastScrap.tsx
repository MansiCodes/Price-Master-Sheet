import { DecimalInput } from "@/components/ui/DecimalInput";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";
import {
  EMPTY_UPCAST_PETTY_ITEM,
  type UpcastPettyItem,
} from "@/components/today/hub/useTodayHubUpcastFields";

function pettyRowRemovable(item: UpcastPettyItem, count: number) {
  return count > 1 || item.qty.trim() !== "" || item.weight.trim() !== "";
}

export function HubStockUpcastPettyRows({ vm }: { vm: TodayHubVm }) {
  const { upcastPettyItems, setUpcastPettyItems } = bindStockLocals(vm);
  const updateItem = (idx: number, patch: Partial<UpcastPettyItem>) =>
    setUpcastPettyItems((prev) => prev.map((p, j) => (j === idx ? { ...p, ...patch } : p)));
  const removeItem = (idx: number) =>
    setUpcastPettyItems((prev) => {
      const next = prev.filter((_, j) => j !== idx);
      return next.length > 0 ? next : [{ ...EMPTY_UPCAST_PETTY_ITEM }];
    });
  return (
    <div className="upcast-petty">
      <div className="upcast-petty__head">
        <span>Petty</span>
        <button
          type="button"
          className="upcast-petty__add"
          onClick={() => setUpcastPettyItems((prev) => [...prev, { ...EMPTY_UPCAST_PETTY_ITEM }])}
          title="Add petty"
        >
          +
        </button>
      </div>
      {upcastPettyItems.map((item, idx) => (
        <div key={`upcast-petty-${idx}`} className="upcast-petty__row">
          <div className="field">
            <label htmlFor={`upcast-petty-qty-${idx}`}>Petty Qty (Bundles)</label>
            <DecimalInput
              id={`upcast-petty-qty-${idx}`}
              value={item.qty}
              onChange={(v) => updateItem(idx, { qty: v })}
              placeholder="e.g. 5"
            />
          </div>
          <div className="field">
            <label htmlFor={`upcast-petty-wt-${idx}`}>Weight per Petty (KGS)</label>
            <DecimalInput
              id={`upcast-petty-wt-${idx}`}
              value={item.weight}
              onChange={(v) => updateItem(idx, { weight: v })}
              placeholder="e.g. 1799"
            />
          </div>
          {pettyRowRemovable(item, upcastPettyItems.length) ? (
            <button
              type="button"
              className="upcast-petty__remove"
              onClick={() => removeItem(idx)}
              title="Remove petty"
            >
              ✕
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
}

export function HubStockUpcastScrapInputs({ vm }: { vm: TodayHubVm }) {
  const {
    upcastTotalScrapWeight, setUpcastTotalScrapWeight, upcastBurningLossWeight, setUpcastBurningLossWeight,
  } = bindStockLocals(vm);
  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <div className="form-grid" style={{ gap: "10px", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div className="field">
          <label htmlFor="upcast-tot-scrap">Total Raw Scrap Wt (KGS)</label>
          <DecimalInput id="upcast-tot-scrap" value={upcastTotalScrapWeight} onChange={setUpcastTotalScrapWeight} placeholder="e.g. 9000" />
        </div>
        <div className="field">
          <label htmlFor="upcast-burn-loss">Burning Loss Wt (KGS)</label>
          <DecimalInput id="upcast-burn-loss" value={upcastBurningLossWeight} onChange={setUpcastBurningLossWeight} placeholder="e.g. 20" />
        </div>
      </div>
      <HubStockUpcastPettyRows vm={vm} />
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

function pettyFormula(items: UpcastPettyItem[]) {
  const filled = items.filter((p) => p.qty.trim() !== "" || p.weight.trim() !== "");
  if (filled.length === 0) return "0 petty × 0 kg";
  return filled.map((p) => `${p.qty || 0} × ${p.weight || 0} kg`).join(" + ");
}

export function HubStockUpcastScrapSummary({ vm }: { vm: TodayHubVm }) {
  const {
    upcastPettyItems, upcastTotalPettyWeight, upcastTotalScrapWeight,
    upcastSortingLossWeight, upcastWeightAfterBurning,
  } = bindStockLocals(vm);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", marginTop: "10px", borderTop: "1px solid #ccfbf1", fontSize: "0.82rem", color: "#115e59" }}>
      <span>
        Total Petty Wt = {pettyFormula(upcastPettyItems)} = <strong>{upcastTotalPettyWeight.toLocaleString("en-IN")} KGS</strong>
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
