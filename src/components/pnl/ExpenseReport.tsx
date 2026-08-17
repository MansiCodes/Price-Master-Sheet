"use client";

import { useCallback, useEffect, useState } from "react";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";

type ExpenseRow = {
  id: string;
  date: string;
  shift: string;
  expenseHead: string;
  description: string | null;
  openingReading: string | number | null;
  closingReading: string | number | null;
  amount: string | number;
  contractorSalary: string | number;
  supervisorSalary: string | number;
};

function isoDate(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function totalAmount(r: ExpenseRow) {
  return (
    Number(r.amount) + Number(r.contractorSalary) + Number(r.supervisorSalary)
  );
}

export function ExpenseReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/plants/${plantId}/petty-cash?entryType=EXPENSE&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pageSize=200`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load expenses");
        setRows([]);
        return;
      }
      setRows(json.rows ?? []);
    } catch {
      setError("Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [plantId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ReportColumn<ExpenseRow>[] = [
    { key: "date", label: "Date", render: (r) => isoDate(r.date) },
    { key: "shift", label: "Shift", render: (r) => r.shift },
    { key: "head", label: "Category", render: (r) => r.expenseHead },
    {
      key: "desc",
      label: "Remarks / notes",
      wrap: "wide",
      render: (r) => r.description || "—",
    },
    {
      key: "opening",
      label: "Opening reading",
      align: "right",
      render: (r) =>
        r.openingReading == null ? "—" : String(r.openingReading),
    },
    {
      key: "closing",
      label: "Closing reading",
      align: "right",
      render: (r) =>
        r.closingReading == null ? "—" : String(r.closingReading),
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      render: (r) => formatINR(totalAmount(r)),
    },
  ];

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">Expense</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable columns={columns} rows={rows} loading={loading} />
    </section>
  );
}
