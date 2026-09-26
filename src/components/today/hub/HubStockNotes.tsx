import { BillUpload } from "@/components/today/BillUpload";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindStockLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubStockPurchaseRateHint({ vm }: { vm: TodayHubVm }) {
  const { stockPurchaseRateLoading, stockPurchaseRate, stockUnit } = bindStockLocals(vm);
  if (stockPurchaseRateLoading) {
    return <p className="field-hint">Loading rate from purchase history…</p>;
  }
  if (stockPurchaseRate == null) return null;
  return (
    <p className="field-hint">
      Suggested from purchase history: ₹{stockPurchaseRate.toFixed(2)}/{stockUnit || "KGS"} (weighted average — edit if needed)
    </p>
  );
}

export function HubStockNotes({ vm }: { vm: TodayHubVm }) {
  const { stockNotes, setStockNotes, stockPhotos, setStockPhotos } = bindStockLocals(vm);
  return (
    <>
      <HubStockPurchaseRateHint vm={vm} />
      <div className="field field--wide expense-desc">
        <label htmlFor="st-notes">Notes</label>
        <textarea id="st-notes" value={stockNotes} onChange={(e) => setStockNotes(e.target.value)} rows={3} />
      </div>
      <BillUpload label="Upload stock images (optional)" urls={stockPhotos} onChange={setStockPhotos} />
    </>
  );
}
