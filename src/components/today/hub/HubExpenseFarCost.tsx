import { DecimalInput } from "@/components/ui/DecimalInput";
import { formatINR } from "@/lib/format/inr";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubExpenseFarDesc({ vm }: { vm: TodayHubVm }) {
  const { farDescription, setFarDescription } = bindExpenseLocals(vm);
  return (
    <div className="field">
      <label htmlFor="far-desc">Assets Description</label>
      <input id="far-desc" required value={farDescription} onChange={(e) => setFarDescription(e.target.value)} />
    </div>
  );
}

export function HubExpenseFarBillRow({ vm }: { vm: TodayHubVm }) {
  const { farBillNumber, setFarBillNumber, farCost, setFarCost, farGst, setFarGst } = bindExpenseLocals(vm);
  return (
    <div className="prod-fields__row">
      <div className="field">
        <label htmlFor="far-bill">Bill Number</label>
        <input id="far-bill" value={farBillNumber} onChange={(e) => setFarBillNumber(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="far-cost">Billing Price (₹)</label>
        <DecimalInput
          id="far-cost"
          required
          value={farCost}
          onChange={(next) => {
            setFarCost(next);
            const cost = Number(next);
            if (Number.isFinite(cost) && cost > 0 && farGst === "") {
              setFarGst((cost * 0.18).toFixed(2));
            }
          }}
        />
      </div>
    </div>
  );
}

export function HubExpenseFarGstRow({ vm }: { vm: TodayHubVm }) {
  const { farGst, setFarGst, farCost, farDepPercent, setFarDepPercent } = bindExpenseLocals(vm);
  return (
    <>
      <div className="prod-fields__row">
        <div className="field">
          <label htmlFor="far-gst">GST @18% (₹)</label>
          <DecimalInput id="far-gst" value={farGst} onChange={setFarGst} />
        </div>
        <div className="field">
          <label htmlFor="far-invoice">Invoice Value</label>
          <input
            id="far-invoice"
            readOnly
            value={formatINR(
              (Number(farCost) || 0) + (farGst === "" ? (Number(farCost) || 0) * 0.18 : Number(farGst) || 0),
            )}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="far-dep">Depreciation %</label>
        <DecimalInput id="far-dep" value={farDepPercent} onChange={setFarDepPercent} />
      </div>
    </>
  );
}
