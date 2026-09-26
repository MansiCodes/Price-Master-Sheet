import { SelectMenu } from "@/components/ui/SelectMenu";
import { BillUpload } from "@/components/today/BillUpload";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubExpenseUnloadPaid({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { paidTo, setPaidTo, expensePayMode, setExpensePayMode } = bindExpenseLocals(vm);
  return (
    <>
      <div className="field">
        <label htmlFor="e-paid">{t("paidTo")}</label>
        <input id="e-paid" value={paidTo} onChange={(e) => setPaidTo(e.target.value)} />
      </div>
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
    </>
  );
}

export function HubExpenseUnloadNotes({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { expenseDesc, setExpenseDesc, expensePhotos, setExpensePhotos } = bindExpenseLocals(vm);
  return (
    <>
      <div className="field expense-desc">
        <label htmlFor="e-desc">{t("remarksNotes")}</label>
        <textarea id="e-desc" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} rows={3} />
      </div>
      <BillUpload urls={expensePhotos} onChange={setExpensePhotos} />
    </>
  );
}
