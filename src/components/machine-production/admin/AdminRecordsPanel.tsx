"use client";

import type { Dispatch, SetStateAction } from "react";
import { TablePageLoadingSkeleton } from "@/components/loading/CoreLoadingSkeleton";
import { ReportRowActions } from "@/components/pnl/ReportRowActions";
import { Pagination } from "@/components/ui/Pagination";
import { addDaysYmd } from "@/lib/machine-production/slots";
import { formatDayMonthYear } from "@/lib/dates";
import type {
  EntryRow,
  MachineDayRow,
} from "@/components/machine-production/admin-dashboard-model";

type Props = {
  loading: boolean;
  recordsByDate: [string, MachineDayRow[]][];
  todayYmd: string;
  expandedMachineDays: Record<string, boolean>;
  setExpandedMachineDays: Dispatch<SetStateAction<Record<string, boolean>>>;
  entriesPage: number;
  entriesPageSize: number;
  entriesTotal: number;
  setEntriesPage: (page: number) => void;
  setEntriesPageSize: (size: number) => void;
  onSelect: (entry: EntryRow) => void;
  onEdit: (entry: EntryRow) => void;
  onDelete: (id: string) => void;
};

export function AdminRecordsPanel({
  loading,
  recordsByDate,
  todayYmd,
  expandedMachineDays,
  setExpandedMachineDays,
  entriesPage,
  entriesPageSize,
  entriesTotal,
  setEntriesPage,
  setEntriesPageSize,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  if (loading) {
    return (
      <TablePageLoadingSkeleton
        rows={8}
        label="Loading production records"
        showChrome={false}
      />
    );
  }

  return (
    <>
      {recordsByDate.length === 0 ? (
        <p className="mp-muted mp-records-empty">
          No records for these filters.
        </p>
      ) : (
        <div className="mp-records-days">
          {recordsByDate.map(([date, rows]) => {
            const isToday = date === todayYmd;
            const isYesterday = date === addDaysYmd(todayYmd, -1);
            const dayLabel = isToday
              ? "Today"
              : isYesterday
                ? "Yesterday"
                : formatDayMonthYear(date);
            return (
              <section key={date} className="mp-records-day">
                <header className="mp-records-day__head">
                  <h2 className="mp-records-day__title">
                    {dayLabel}
                    <span className="mp-records-day__date">
                      {formatDayMonthYear(date)}
                    </span>
                  </h2>
                  <span className="mp-records-day__count">
                    {rows.length} machine
                    {rows.length === 1 ? "" : "s"}
                  </span>
                </header>
                <ol className="mp-records-grid">
                  {rows.map((row) => (
                    <AdminRecordCard
                      key={`${row.date}|${row.machineId}`}
                      row={row}
                      open={Boolean(
                        expandedMachineDays[`${row.date}|${row.machineId}`],
                      )}
                      onToggle={() => {
                        const cardKey = `${row.date}|${row.machineId}`;
                        setExpandedMachineDays((prev) => ({
                          ...prev,
                          [cardKey]: !prev[cardKey],
                        }));
                      }}
                      onSelect={onSelect}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}
      <Pagination
        page={entriesPage}
        pageSize={entriesPageSize}
        total={entriesTotal}
        onPageChange={setEntriesPage}
        onPageSizeChange={(nextSize) => {
          setEntriesPageSize(nextSize);
          setEntriesPage(1);
        }}
      />
    </>
  );
}

function AdminRecordCard({
  row,
  open,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
}: {
  row: MachineDayRow;
  open: boolean;
  onToggle: () => void;
  onSelect: (entry: EntryRow) => void;
  onEdit: (entry: EntryRow) => void;
  onDelete: (id: string) => void;
}) {
  const slots = row.slots ?? [];
  const ops = slots.reduce((s, e) => s + (e.operators || 0), 0);
  const helpers = slots.reduce((s, e) => s + (e.helpers || 0), 0);
  const manpower = slots.reduce((s, e) => s + (e.totalManpower || 0), 0);

  return (
    <li className={`mp-records-card${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="mp-records-card__toggle"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="mp-records-card__toggle-main">
          <h3 className="mp-records-card__title">
            <span className="mp-records-card__name">{row.machineName}</span>
            {row.machineCode ? (
              <span className="mp-records-card__code">{row.machineCode}</span>
            ) : null}
          </h3>
          {!open ? (
            <p className="mp-records-card__totals">
              <span className="mp-records-val">{row.entries}</span> slot
              {row.entries === 1 ? "" : "s"} · Planned{" "}
              <span className="mp-records-val">{row.plannedProduction}</span>{" "}
              · Actual{" "}
              <span className="mp-records-val">{row.actualProduction}</span>{" "}
              · Eff <span className="mp-records-val">{row.efficiencyPct}%</span>
            </p>
          ) : null}
        </span>
        <span
          className={`mp-expand-chevron${open ? " mp-expand-chevron--open" : ""}`}
          aria-hidden
        >
          ▸
        </span>
      </button>
      {open ? (
        <>
          <ul className="mp-records-card__slots">
            {slots.map((e) => (
              <li key={e.id} className="mp-records-slot">
                <button
                  type="button"
                  className="mp-records-slot__main"
                  onClick={() => onSelect(e)}
                >
                  <span className="mp-records-slot__when">
                    {e.shiftLabel} · {e.slotLabel}
                  </span>
                  <span className="mp-records-slot__line">
                    {e.operatorName?.trim() || "—"} · {e.currentProcess || "—"}
                  </span>
                  <span className="mp-records-slot__line mp-muted">
                    {e.cableType} · {e.cableSize}
                  </span>
                  <span className="mp-records-slot__metrics">
                    Planned{" "}
                    <span className="mp-records-val">{e.plannedProduction}</span>{" "}
                    · Actual{" "}
                    <span className="mp-records-val">{e.actualProduction}</span>{" "}
                    · Eff{" "}
                    <span className="mp-records-val">{e.efficiencyPct}%</span>
                  </span>
                  <span className="mp-records-slot__metrics">
                    Ops <span className="mp-records-val">{e.operators}</span> ·
                    Helpers <span className="mp-records-val">{e.helpers}</span>{" "}
                    · Manpower{" "}
                    <span className="mp-records-val">{e.totalManpower}</span>
                  </span>
                </button>
                <div className="mp-records-slot__actions">
                  <span
                    className={`mp-status mp-status--${
                      e.status === "COMPLETED"
                        ? "ok"
                        : e.status === "OVERDUE"
                          ? "overdue"
                          : "pending"
                    }`}
                  >
                    {e.status}
                  </span>
                  <ReportRowActions
                    onEdit={() => onEdit(e)}
                    onDelete={() => onDelete(e.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mp-records-card__footer">
            <span className="mp-records-card__footer-label">Total</span>
            <span>
              Slots <span className="mp-records-val">{row.entries}</span> ·
              Planned{" "}
              <span className="mp-records-val">{row.plannedProduction}</span> ·
              Actual{" "}
              <span className="mp-records-val">{row.actualProduction}</span> ·
              Eff <span className="mp-records-val">{row.efficiencyPct}%</span>
            </span>
            <span>
              Ops <span className="mp-records-val">{ops}</span> · Helpers{" "}
              <span className="mp-records-val">{helpers}</span> · Manpower{" "}
              <span className="mp-records-val">{manpower}</span>
            </span>
          </div>
        </>
      ) : null}
    </li>
  );
}
