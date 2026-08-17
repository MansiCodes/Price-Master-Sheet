"use client";

import { useCallback, useEffect, useState } from "react";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { formatDisplayDate } from "@/components/pnl/types";

type PettyCashRow = {
  id: string;
  date: string;
  payMode: string;
  description: string | null;
  billNumber: string | null;
  amount: string | number;
  contractorSalary: string | number;
  supervisorSalary: string | number;
};

function isoDate(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function rowTotal(r: PettyCashRow) {
  return (
    Number(r.amount) + Number(r.contractorSalary) + Number(r.supervisorSalary)
  );
}

export function PettyCashReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const [rows, setRows] = useState<PettyCashRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/plants/${plantId}/petty-cash?entryType=PETTY_CASH&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pageSize=500`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load petty cash");
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

  const totals = rows.reduce(
    (acc, r) => ({
      expenses: acc.expenses + Number(r.amount),
      contractor: acc.contractor + Number(r.contractorSalary),
      supervisor: acc.supervisor + Number(r.supervisorSalary),
      total: acc.total + rowTotal(r),
    }),
    { expenses: 0, contractor: 0, supervisor: 0, total: 0 },
  );

  const columns: ReportColumn<PettyCashRow>[] = [
    {
      key: "s",
      label: "S No.",
      compact: true,
      render: (_r, index) => String((index ?? 0) + 1),
    },
    {
      key: "payMode",
      label: "Pay mode",
      render: (r) => r.payMode || "—",
    },
    {
      key: "desc",
      label: "Description of expense",
      wrap: "wide",
      render: (r) => r.description?.trim() || "—",
    },
    {
      key: "billNumber",
      label: "Bill number",
      wrap: true,
      render: (r) => r.billNumber?.trim() || "—",
    },
    {
      key: "billDate",
      label: "Bill date",
      render: (r) => formatDisplayDate(isoDate(r.date)),
    },
    {
      key: "expenses",
      label: "Expenses",
      align: "right",
      render: (r) => formatINR(Number(r.amount)),
    },
    {
      key: "contractor",
      label: "Contractor salary",
      align: "right",
      render: (r) => formatINR(Number(r.contractorSalary)),
    },
    {
      key: "supervisor",
      label: "Supervisor salary",
      align: "right",
      render: (r) => formatINR(Number(r.supervisorSalary)),
    },
    {
      key: "total",
      label: "Total",
      align: "right",
      render: (r) => formatINR(rowTotal(r)),
    },
  ];

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">Petty cash expense details</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={columns}
        rows={rows}
        loading={loading}
        variant="register"
        emptyLabel="No petty cash entries in this date range."
      />
      {rows.length > 0 ? (
        <dl className="pnl-report-totals">
          <div>
            <dt>Expenses</dt>
            <dd>{formatINR(totals.expenses)}</dd>
          </div>
          <div>
            <dt>Contractor salary</dt>
            <dd>{formatINR(totals.contractor)}</dd>
          </div>
          <div>
            <dt>Supervisor salary</dt>
            <dd>{formatINR(totals.supervisor)}</dd>
          </div>
          <div className="is-grand">
            <dt>Total</dt>
            <dd>{formatINR(totals.total)}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
