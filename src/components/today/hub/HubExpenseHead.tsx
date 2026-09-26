import { SelectMenu } from "@/components/ui/SelectMenu";
import { PVC_EXPENSE_SECTIONS, getExpenseHeadsForSection } from "@/lib/plant-catalogs";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { bindExpenseLocals } from "@/components/today/hub/bind-today-hub-locals";
import { onExpenseHeadChange } from "@/components/today/hub/on-expense-head-change";

export function HubExpenseSectionField({ vm }: { vm: TodayHubVm }) {
  const { hasExpenseSections, expenseSection, setExpenseSection, setExpenseHead, plantCode } =
    bindExpenseLocals(vm);
  if (!hasExpenseSections) return null;
  return (
    <div className="field">
      <label htmlFor="e-section">Expense section</label>
      <SelectMenu
        id="e-section"
        value={PVC_EXPENSE_SECTIONS.find((s) => s.value === expenseSection)?.label ?? "Direct Expense"}
        options={PVC_EXPENSE_SECTIONS.map((s) => s.label)}
        required
        onChange={(label) => {
          const next = PVC_EXPENSE_SECTIONS.find((s) => s.label === label);
          if (!next) return;
          setExpenseSection(next.value);
          const heads = [...getExpenseHeadsForSection(plantCode, next.value)];
          setExpenseHead(heads[0] ?? "");
        }}
      />
    </div>
  );
}

export function HubExpenseCategoryField({
  vm,
  t,
}: {
  vm: TodayHubVm;
  t: (key: string) => string;
}) {
  const { expenseHead, expenseHeads, isCat6, expenseSection } = bindExpenseLocals(vm);
  return (
    <div className="field">
      <label htmlFor="e-head">{t("category")}</label>
      <SelectMenu
        id="e-head"
        value={String(expenseHead)}
        options={expenseHeads.length > 0 ? expenseHeads : ["—"]}
        required={expenseHeads.length > 0}
        disabled={expenseHeads.length === 0}
        onChange={(next) => onExpenseHeadChange(vm, next)}
      />
      {isCat6 && expenseSection === "indirect" && expenseHeads.length === 0 ? (
        <p className="field-hint">
          No indirect categories. Use Direct for Petty Cash, or add Salary & Wages / Miscellaneous under Indirect.
        </p>
      ) : null}
    </div>
  );
}

export function HubExpenseHead({ vm, t }: { vm: TodayHubVm; t: (key: string) => string }) {
  return (
    <>
      <HubExpenseSectionField vm={vm} />
      <HubExpenseCategoryField vm={vm} t={t} />
    </>
  );
}
