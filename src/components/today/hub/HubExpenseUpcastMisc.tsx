import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { BillUpload } from "@/components/today/BillUpload";
import { UPCAST_MISC_NATURES } from "@/lib/plant-catalogs";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubExpenseUpcastMiscPay({ vm }: { vm: TodayHubVm }) {
  const { expensePayMode, setExpensePayMode, upcastMiscNature, setUpcastMiscNature } = bindExpenseLocals(vm);
  return (
    <>
      <div className="field">
        <label htmlFor="e-pay-mode">Pay Mode</label>
        <SelectMenu
          id="e-pay-mode"
          value={expensePayMode}
          options={["Cash", "Bank"]}
          required
          onChange={(next) => setExpensePayMode(next === "Bank" ? "Bank" : "Cash")}
        />
      </div>
      <div className="field">
        <label htmlFor="e-misc-nature">Nature of Expense</label>
        <SelectMenu
          id="e-misc-nature"
          value={upcastMiscNature}
          options={[...UPCAST_MISC_NATURES]}
          required
          onChange={setUpcastMiscNature}
        />
      </div>
    </>
  );
}

export function HubExpenseUpcastMiscAmount({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { expenseAmount, setExpenseAmount, paidTo, setPaidTo, expenseDesc, setExpenseDesc, expensePhotos, setExpensePhotos } =
    bindExpenseLocals(vm);
  return (
    <>
      <div className="prod-fields__row">
        <div className="field">
          <label htmlFor="e-amt">Factory Expense</label>
          <DecimalInput id="e-amt" required value={expenseAmount} onChange={setExpenseAmount} />
        </div>
        <div className="field">
          <label htmlFor="e-paid">{t("paidTo")}</label>
          <input id="e-paid" value={paidTo} onChange={(e) => setPaidTo(e.target.value)} />
        </div>
      </div>
      <div className="field expense-desc">
        <label htmlFor="e-desc">Description of Expense</label>
        <textarea id="e-desc" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} rows={4} />
      </div>
      <BillUpload urls={expensePhotos} onChange={setExpensePhotos} />
    </>
  );
}

export function HubExpenseUpcastMisc({ vm, t }: { vm: TodayHubVm; t: (key: string) => string }) {
  return (
    <>
      <HubExpenseUpcastMiscPay vm={vm} />
      <HubExpenseUpcastMiscAmount vm={vm} t={t} />
    </>
  );
}
