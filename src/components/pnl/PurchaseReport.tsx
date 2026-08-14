"use client";

import { useCallback, useEffect, useState } from "react";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";

type PurchaseRow = {
  id: string;
  date: string;
  billDate?: string | null;
  billNumber?: string | null;
  notes?: string | null;
  vendorName: string;
  itemDescription: string;
  quantity: string | number;
  unit: string;
  rate: string | number;
  basicValue: string | number;
  gstPercent: string | number;
  gstAmount: string | number;
  invoiceValue: string | number;
};

function isoDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function formatBillDate(value: string | Date | null | undefined) {
  const iso = isoDate(value);
  if (iso === "—") return "—";
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function num(value: string | number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatQty(value: string | number) {
  return num(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function PurchaseReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/plants/${plantId}/purchases?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pageSize=500`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load purchases");
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

  const columns: ReportColumn<PurchaseRow>[] = [
    {
      key: "sno",
      label: "S No.",
      render: (_r, index) => String((index ?? 0) + 1),
    },
    {
      key: "supplier",
      label: "Supplier name",
      wrap: true,
      render: (r) => r.vendorName,
    },
    {
      key: "description",
      label: "Description",
      wrap: true,
      render: (r) => r.itemDescription,
    },
    {
      key: "billNo",
      label: "Bill no.",
      render: (r) => r.billNumber?.trim() || "—",
    },
    {
      key: "billDate",
      label: "Bill date",
      render: (r) => formatBillDate(r.billDate || r.date),
    },
    {
      key: "unit",
      label: "Unit",
      compact: true,
      render: (r) => r.unit || "—",
    },
    {
      key: "qty",
      label: "Qty",
      align: "right",
      compact: true,
      render: (r) => formatQty(r.quantity),
    },
    {
      key: "rate",
      label: "Rate",
      align: "right",
      compact: true,
      render: (r) => formatQty(r.rate),
    },
    {
      key: "basic",
      label: "Basic value",
      align: "right",
      render: (r) => formatINR(num(r.basicValue) || num(r.quantity) * num(r.rate)),
    },
    {
      key: "gst",
      label: "GST",
      align: "right",
      headerAlign: "center",
      render: (r) => {
        const pct = num(r.gstPercent);
        const amt = num(r.gstAmount);
        return pct > 0 ? `${formatINR(amt)} @ ${pct}%` : formatINR(amt);
      },
    },
    {
      key: "invoice",
      label: "Invoice value",
      align: "right",
      render: (r) => formatINR(r.invoiceValue),
    },
    {
      key: "remarks",
      label: "Remarks",
      wrap: "wide",
      render: (r) => r.notes?.trim() || "—",
    },
  ];

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">Purchase</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={columns}
        rows={rows}
        loading={loading}
        variant="register"
      />
    </section>
  );
}
