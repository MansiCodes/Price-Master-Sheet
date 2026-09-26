import { DecimalInput } from "@/components/ui/DecimalInput";
import { formatINR } from "@/lib/format/inr";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubExpenseRentArea({ vm }: { vm: TodayHubVm }) {
  const { expenseMonth, setExpenseMonth, rentCoveredArea, setRentCoveredArea, rentRatePerSqft, setRentRatePerSqft } =
    bindExpenseLocals(vm);
  return (
    <>
      <div className="field">
        <label htmlFor="e-month">Month</label>
        <input id="e-month" type="month" required value={expenseMonth} onChange={(e) => setExpenseMonth(e.target.value)} />
      </div>
      <div className="prod-fields__row">
        <div className="field">
          <label htmlFor="e-rent-area">Covered Area (sqft)</label>
          <DecimalInput id="e-rent-area" value={rentCoveredArea} onChange={setRentCoveredArea} />
        </div>
        <div className="field">
          <label htmlFor="e-rent-rate">Rate (₹/sqft)</label>
          <DecimalInput id="e-rent-rate" value={rentRatePerSqft} onChange={setRentRatePerSqft} />
        </div>
      </div>
    </>
  );
}

export function HubExpenseRentNotes({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { rentCoveredArea, rentRatePerSqft, expenseAmount, expenseDesc, setExpenseDesc } = bindExpenseLocals(vm);
  return (
    <>
      <p className="cost-hint">
        Rent amount{" "}
        <span className="cost-hint__amount">
          {formatINR(
            Number(rentCoveredArea) > 0
              ? Number(rentCoveredArea) * (Number(rentRatePerSqft) || 12)
              : Number(expenseAmount) || 0,
          )}
        </span>
      </p>
      <div className="field expense-desc">
        <label htmlFor="e-desc">{t("remarksNotes")}</label>
        <textarea id="e-desc" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} rows={3} />
      </div>
    </>
  );
}

export function HubExpenseRent({ vm, t }: { vm: TodayHubVm; t: (key: string) => string }) {
  return (
    <>
      <HubExpenseRentArea vm={vm} />
      <HubExpenseRentNotes vm={vm} t={t} />
    </>
  );
}
