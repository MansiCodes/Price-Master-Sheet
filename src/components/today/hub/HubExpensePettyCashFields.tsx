import { DecimalInput } from "@/components/ui/DecimalInput";
import { BillUpload } from "@/components/today/BillUpload";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";

export function HubExpensePettyCashPay({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { pettyCashPayMode, setPettyCashPayMode } = bindExpenseLocals(vm);
  return (
    <div className="field">
      <label htmlFor="pc-pay-mode">{t("payMode")}</label>
      <input
        id="pc-pay-mode"
        required
        placeholder="e.g. ADV-Cash or ADV-Bank"
        value={pettyCashPayMode}
        onChange={(e) => setPettyCashPayMode(e.target.value)}
      />
    </div>
  );
}

export function HubExpensePettyCashBill({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { pettyCashBillNumber, setPettyCashBillNumber } = bindExpenseLocals(vm);
  return (
    <div className="field">
      <label htmlFor="pc-bill-number">{t("billNumber")}</label>
      <input
        id="pc-bill-number"
        value={pettyCashBillNumber}
        onChange={(e) => setPettyCashBillNumber(e.target.value)}
      />
    </div>
  );
}

export function HubExpensePettyCashDesc({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { pettyCashDescription, setPettyCashDescription } = bindExpenseLocals(vm);
  return (
    <div className="field expense-desc">
      <label htmlFor="pc-description">{t("descriptionOfExpense")}</label>
      <textarea
        id="pc-description"
        required
        value={pettyCashDescription}
        onChange={(e) => setPettyCashDescription(e.target.value)}
        rows={4}
      />
    </div>
  );
}

export function HubExpensePettyCashAmounts({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { pettyCashExpense, setPettyCashExpense, pettyCashContractorSalary, setPettyCashContractorSalary } =
    bindExpenseLocals(vm);
  return (
    <div className="prod-fields__row">
      <div className="field">
        <label htmlFor="pc-expense">{t("expenses")}</label>
        <DecimalInput id="pc-expense" value={pettyCashExpense} onChange={setPettyCashExpense} />
      </div>
      <div className="field">
        <label htmlFor="pc-contractor">{t("contractorSalary")}</label>
        <DecimalInput id="pc-contractor" value={pettyCashContractorSalary} onChange={setPettyCashContractorSalary} />
      </div>
    </div>
  );
}

export function HubExpensePettyCashSupervisor({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { pettyCashSupervisorSalary, setPettyCashSupervisorSalary, pettyCashPhotos, setPettyCashPhotos } =
    bindExpenseLocals(vm);
  return (
    <>
      <div className="field">
        <label htmlFor="pc-supervisor">{t("supervisorSalary")}</label>
        <DecimalInput id="pc-supervisor" value={pettyCashSupervisorSalary} onChange={setPettyCashSupervisorSalary} />
      </div>
      <BillUpload label={t("uploadBill")} urls={pettyCashPhotos} onChange={setPettyCashPhotos} />
    </>
  );
}
