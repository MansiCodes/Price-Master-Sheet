import {
  PVC_EXPENSE_SECTIONS,
  expenseHeadLabelLines,
  expenseHeadTabLabel,
  type PvcExpenseSection,
} from "@/lib/plant-catalogs";

export function ExpenseSectionNav({
  section,
  sectionHeads,
  category,
  onSectionChange,
  onCategoryChange,
}: {
  section: PvcExpenseSection;
  sectionHeads: string[];
  category: string;
  onSectionChange: (next: PvcExpenseSection) => void;
  onCategoryChange: (head: string) => void;
}) {
  return (
    <div className="pnl-expense-navigation-group">
      <div
        className="pnl-tab-nav pnl-tab-nav--fit pnl-expense-type-nav"
        role="tablist"
        aria-label="Expense section"
      >
        {PVC_EXPENSE_SECTIONS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            role="tab"
            aria-selected={section === entry.value}
            className={section === entry.value ? "is-active" : undefined}
            onClick={() => onSectionChange(entry.value)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {sectionHeads.length > 0 ? (
        <div
          className={
            sectionHeads.length <= 2
              ? "pnl-tab-nav pnl-expense-cat-nav pnl-expense-cat-nav--cols-2"
              : `pnl-tab-nav pnl-expense-cat-nav-multi pnl-expense-cat-pills--n${sectionHeads.length}`
          }
          role="tablist"
          aria-label={
            section === "direct"
              ? "Direct expense types"
              : "Indirect expense types"
          }
        >
          {sectionHeads.map((head) => {
            const lines = expenseHeadLabelLines(head);
            const shortLabel = expenseHeadTabLabel(head);
            return (
              <button
                key={head}
                type="button"
                role="tab"
                aria-label={head}
                title={head}
                aria-selected={category === head}
                className={category === head ? "is-active" : undefined}
                onClick={() => onCategoryChange(head)}
              >
                {lines ? (
                  <>
                    <span className="pnl-expense-cat-label--full">{head}</span>
                    <span className="pnl-expense-cat-label--stacked pnl-tab-nav__stacked">
                      <span>{lines[0]}</span>
                      <span>{lines[1]}</span>
                    </span>
                  </>
                ) : shortLabel !== head ? (
                  <>
                    <span className="pnl-expense-cat-label--full">{head}</span>
                    <span className="pnl-expense-cat-label--short">
                      {shortLabel}
                    </span>
                  </>
                ) : (
                  head
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="pnl-expense-empty-hint">No categories in this section.</p>
      )}
    </div>
  );
}
