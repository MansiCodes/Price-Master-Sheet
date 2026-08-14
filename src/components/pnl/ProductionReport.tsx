"use client";

import { useCallback, useEffect, useState } from "react";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";

type ProductionRow = {
  id: string;
  date: string;
  shift: string;
  productName: string;
  quantity: string | number;
  unit: string;
};

function isoDate(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function ProductionReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const [rows, setRows] = useState<ProductionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/plants/${plantId}/production?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pageSize=200`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load production");
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

  const columns: ReportColumn<ProductionRow>[] = [
    { key: "date", label: "Date", render: (r) => isoDate(r.date) },
    { key: "shift", label: "Shift", render: (r) => r.shift },
    { key: "product", label: "Product", render: (r) => r.productName },
    {
      key: "qty",
      label: "Quantity",
      align: "right",
      render: (r) => `${Number(r.quantity)} ${r.unit}`,
    },
  ];

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">Production</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable columns={columns} rows={rows} loading={loading} />
    </section>
  );
}
