import { DecimalInput } from "@/components/ui/DecimalInput";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubExpensePowerBillRow({ vm }: { vm: TodayHubVm }) {
  const { expenseRate, setExpenseRate, expenseAmount } = bindExpenseLocals(vm);
  return (
    <div className="prod-fields__row">
      <div className="field">
        <label htmlFor="e-rate">Rate (₹/unit)</label>
        <DecimalInput id="e-rate" value={expenseRate} onChange={setExpenseRate} placeholder="0" />
      </div>
      <div className="field">
        <label htmlFor="e-amt">Electricity bill Amt</label>
        <input
          id="e-amt"
          readOnly
          style={{ backgroundColor: "#f3f4f6" }}
          value={expenseAmount}
          placeholder="Calculated automatically"
        />
      </div>
    </div>
  );
}

export function HubExpensePowerNotes({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { expenseDesc, setExpenseDesc } = bindExpenseLocals(vm);
  return (
    <div className="field expense-desc">
      <label htmlFor="e-desc">{t("remarksNotes")}</label>
      <textarea id="e-desc" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} rows={3} />
    </div>
  );
}
