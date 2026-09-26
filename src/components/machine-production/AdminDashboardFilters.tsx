"use client";

import { useMemo } from "react";
import { SelectMenu } from "@/components/ui/SelectMenu";
import {
  DAY_SLOT_HOURS,
  NIGHT_SLOT_HOURS,
  slotWindowLabel,
} from "@/lib/machine-production/slots";
import { AdminDashboardDateFilter } from "@/components/machine-production/AdminDashboardDateFilter";
import {
  defaultRecordFilters,
  type Filters,
  type MachineRow,
} from "@/components/machine-production/admin-dashboard-model";

const SHIFT_ITEMS = [
  { value: "", label: "All" },
  { value: "DAY", label: "Day" },
  { value: "NIGHT", label: "Night" },
];

type Props = {
  filters: Filters;
  machines: MachineRow[];
  todayYmd: string;
  filtersDirty: boolean;
  loading: boolean;
  entriesTotal: number;
  onPatchFilters: (next: Filters | ((prev: Filters) => Filters)) => void;
  onDownloadPdf: () => void;
};

export function AdminDashboardFilters({
  filters,
  machines,
  todayYmd,
  filtersDirty,
  loading,
  entriesTotal,
  onPatchFilters,
  onDownloadPdf,
}: Props) {
  const slotItems = useMemo(() => {
    const hours =
      filters.shift === "DAY"
        ? DAY_SLOT_HOURS
        : filters.shift === "NIGHT"
          ? NIGHT_SLOT_HOURS
          : [...DAY_SLOT_HOURS, ...NIGHT_SLOT_HOURS];
    return [
      { value: "", label: "All" },
      ...hours.map((h) => ({
        value: String(h),
        label: slotWindowLabel(h),
      })),
    ];
  }, [filters.shift]);

  const machineItems = useMemo(
    () => [
      { value: "", label: "All" },
      ...machines.map((m) => ({
        value: m.id,
        label: m.name,
        searchText: m.code,
      })),
    ],
    [machines],
  );

  return (
    <div className="mp-filters mp-filters--records">
      <label htmlFor="mp-filter-machine" className="mp-filter-field mp-filter-field--machine">
        Machine
        <SelectMenu
          id="mp-filter-machine"
          value={filters.machineId}
          items={machineItems}
          placeholder="All"
          searchable
          searchPlaceholder="Search machines…"
          onChange={(value) =>
            onPatchFilters((f) => ({ ...f, machineId: value }))
          }
        />
      </label>
      <label className="mp-filter-field mp-filter-field--from">
        From
        <input
          type="date"
          className="mp-date-pill"
          value={filters.dateFrom}
          max={filters.dateTo || todayYmd}
          onChange={(e) =>
            onPatchFilters((f) => ({ ...f, dateFrom: e.target.value }))
          }
        />
      </label>
      <label className="mp-filter-field mp-filter-field--to">
        To
        <input
          type="date"
          className="mp-date-pill"
          value={filters.dateTo}
          min={filters.dateFrom || undefined}
          max={todayYmd}
          onChange={(e) =>
            onPatchFilters((f) => ({ ...f, dateTo: e.target.value }))
          }
        />
      </label>
      <label htmlFor="mp-filter-shift" className="mp-filter-field mp-filter-field--shift">
        Shift
        <SelectMenu
          id="mp-filter-shift"
          value={filters.shift}
          items={SHIFT_ITEMS}
          placeholder="All"
          onChange={(value) =>
            onPatchFilters((f) => {
              const nextHours =
                value === "DAY"
                  ? DAY_SLOT_HOURS
                  : value === "NIGHT"
                    ? NIGHT_SLOT_HOURS
                    : [...DAY_SLOT_HOURS, ...NIGHT_SLOT_HOURS];
              const slotOk =
                !f.slotStartHour ||
                (nextHours as readonly number[]).includes(
                  Number(f.slotStartHour),
                );
              return {
                ...f,
                shift: value,
                slotStartHour: slotOk ? f.slotStartHour : "",
              };
            })
          }
        />
      </label>
      <label htmlFor="mp-filter-slot" className="mp-filter-field mp-filter-field--slot">
        Slot
        <SelectMenu
          id="mp-filter-slot"
          value={filters.slotStartHour}
          items={slotItems}
          placeholder="All"
          onChange={(value) =>
            onPatchFilters((f) => ({ ...f, slotStartHour: value }))
          }
        />
      </label>
      <div className="mp-filters__icon-actions">
        <AdminDashboardDateFilter
          filters={filters}
          todayYmd={todayYmd}
          onPatchFilters={onPatchFilters}
        />
        <button
          type="button"
          className="mp-filters__icon-btn"
          title="Reset filters"
          aria-label="Reset filters"
          disabled={!filtersDirty}
          onClick={() => onPatchFilters(defaultRecordFilters())}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span className="mp-filters__icon-btn__text">Reset</span>
        </button>
        <button
          type="button"
          className="mp-filters__icon-btn"
          title="PDF"
          aria-label="Download PDF"
          disabled={loading || entriesTotal === 0}
          onClick={onDownloadPdf}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 18 15 15" />
          </svg>
          <span className="mp-filters__icon-btn__text">PDF</span>
        </button>
      </div>
    </div>
  );
}
