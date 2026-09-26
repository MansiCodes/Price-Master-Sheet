import { DecimalInput } from "@/components/ui/DecimalInput";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubExpensePowerMonth({ vm }: { vm: TodayHubVm }) {
  const { expenseMonth, setExpenseMonth } = bindExpenseLocals(vm);
  return (
    <div className="field">
      <label htmlFor="e-month">Month</label>
      <input
        id="e-month"
        type="month"
        required
        value={expenseMonth}
        onChange={(e) => setExpenseMonth(e.target.value)}
      />
    </div>
  );
}

export function HubExpensePowerMeters({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { expenseOpeningReading, setExpenseOpeningReading, expenseClosingReading, setExpenseClosingReading } =
    bindExpenseLocals(vm);
  return (
    <div className="prod-fields__row">
      <div className="field">
        <label htmlFor="e-opening">{t("openingReading")}</label>
        <DecimalInput id="e-opening" value={expenseOpeningReading} onChange={setExpenseOpeningReading} />
      </div>
      <div className="field">
        <label htmlFor="e-closing">{t("closingReading")}</label>
        <DecimalInput id="e-closing" value={expenseClosingReading} onChange={setExpenseClosingReading} />
      </div>
    </div>
  );
}

export function HubExpensePowerConsumed({ vm }: { vm: TodayHubVm }) {
  const { expenseOpeningReading, expenseClosingReading } = bindExpenseLocals(vm);
  if (expenseOpeningReading === "" || expenseClosingReading === "") return null;
  return (
    <p className="cost-hint">
      Consumed units{" "}
      <span className="cost-hint__amount">
        {Math.max(0, Number(expenseClosingReading) - Number(expenseOpeningReading)).toFixed(2)}
      </span>
    </p>
  );
}
