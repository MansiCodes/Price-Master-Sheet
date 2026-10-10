import { DecimalInput } from "@/components/ui/DecimalInput";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { BillUpload } from "@/components/today/BillUpload";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";
import {
  QUAD_EXPENSE_NAME_EXAMPLES,
  requiresExpenseName,
} from "@/lib/plant-catalogs";

export function HubExpenseDefaultPay({ vm }: { vm: TodayHubVm }) {
  const { isPvcStyleExpense, expensePayMode, setExpensePayMode } = bindExpenseLocals(vm);
  if (!isPvcStyleExpense) return null;
  return (
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
  );
}

export function HubExpenseDefaultAmount({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { isCat6, expenseAmount, setExpenseAmount, paidTo, setPaidTo } = bindExpenseLocals(vm);
  return (
    <div className="prod-fields__row">
      <div className="field">
        <label htmlFor="e-amt">{isCat6 ? "Salary Amt" : t("amount")}</label>
        <DecimalInput id="e-amt" required value={expenseAmount} onChange={setExpenseAmount} />
      </div>
      {isCat6 ? null : (
        <div className="field">
          <label htmlFor="e-paid">{t("paidTo")}</label>
          <input id="e-paid" value={paidTo} onChange={(e) => setPaidTo(e.target.value)} />
        </div>
      )}
    </div>
  );
}

export function HubExpenseDefaultNotes({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const {
    isCat6,
    expenseHead,
    plantCode,
    expenseDesc,
    setExpenseDesc,
    expenseName,
    setExpenseName,
    expensePhotos,
    setExpensePhotos,
  } = bindExpenseLocals(vm);
  const named = requiresExpenseName(plantCode, expenseHead);
  return (
    <>
      {named ? (
        <div className="field">
          <label htmlFor="e-name">Expense name</label>
          <input
            id="e-name"
            list="e-name-examples"
            required
            value={expenseName}
            onChange={(e) => setExpenseName(e.target.value)}
            placeholder="e.g. Labour Wages, Transport Charges"
            autoComplete="off"
          />
          <datalist id="e-name-examples">
            {QUAD_EXPENSE_NAME_EXAMPLES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      ) : null}
      <div className="field expense-desc">
        <label htmlFor="e-desc">{isCat6 ? "Remarks" : t("remarksNotes")}</label>
        <textarea
          id="e-desc"
          value={expenseDesc}
          onChange={(e) => setExpenseDesc(e.target.value)}
          rows={4}
        />
      </div>
      <BillUpload urls={expensePhotos} onChange={setExpensePhotos} />
    </>
  );
}

export function HubExpenseDefault({ vm, t }: { vm: TodayHubVm; t: (key: string) => string }) {
  return (
    <>
      <HubExpenseDefaultPay vm={vm} />
      <HubExpenseDefaultAmount vm={vm} t={t} />
      <HubExpenseDefaultNotes vm={vm} t={t} />
    </>
  );
}
