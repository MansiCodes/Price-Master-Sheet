import type { ShiftFilter } from "@/lib/machine-production/slots";

const SHIFT_TABS: {
  id: ShiftFilter;
  label: string;
  sublabel?: string;
}[] = [
  { id: "ALL", label: "All" },
  { id: "DAY", label: "Day", sublabel: "9AM–9PM" },
  { id: "NIGHT", label: "Night", sublabel: "9PM–9AM" },
];

export function SupervisorShiftTabs({
  shift,
  onShiftChange,
}: {
  shift: ShiftFilter;
  onShiftChange: (shift: ShiftFilter) => void;
}) {
  return (
    <div
      className="mp-shift-tabs mp-shift-tabs--shifts"
      role="tablist"
      aria-label="Shift"
    >
      {SHIFT_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={shift === tab.id}
          aria-label={
            tab.sublabel ? `${tab.label} (${tab.sublabel})` : tab.label
          }
          className={
            shift === tab.id
              ? "mp-shift-tab mp-shift-tab--active"
              : "mp-shift-tab"
          }
          onClick={() => onShiftChange(tab.id)}
        >
          <span className="mp-shift-tab__label">{tab.label}</span>
          {tab.sublabel ? (
            <span className="mp-shift-tab__sub">{tab.sublabel}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
