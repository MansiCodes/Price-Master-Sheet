"use client";

import { useCallback, useEffect, useState } from "react";
import { formatINR } from "@/lib/format/inr";
import type { PlantPnlResult } from "@/lib/pnl/calculate";

type RangeKey = "daily" | "weekly" | "monthly" | "custom";

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeFor(key: RangeKey, customFrom: string, customTo: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (key === "daily") {
    const d = toISODate(today);
    return { from: d, to: d };
  }
  if (key === "weekly") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toISODate(from), to: toISODate(today) };
  }
  if (key === "monthly") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toISODate(from), to: toISODate(today) };
  }
  return { from: customFrom, to: customTo };
}

const ROWS: { key: keyof PlantPnlResult; label: string; tone?: "neg" | "pos" }[] =
  [
    { key: "salesRevenue", label: "Sales revenue", tone: "pos" },
    { key: "cogs", label: "COGS", tone: "neg" },
    { key: "grossProfit", label: "Gross profit" },
    { key: "manpower", label: "Manpower", tone: "neg" },
    { key: "electricity", label: "Electricity", tone: "neg" },
    { key: "rent", label: "Rent", tone: "neg" },
    { key: "pettyCash", label: "Petty cash", tone: "neg" },
    { key: "depreciation", label: "Depreciation", tone: "neg" },
    { key: "netProfit", label: "Net profit" },
  ];

export function PnlClient({ plantId }: { plantId: string }) {
  const today = toISODate(new Date());
  const [range, setRange] = useState<RangeKey>("daily");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [pnl, setPnl] = useState<PlantPnlResult | null>(null);
  const [meta, setMeta] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { from, to } = rangeFor(range, customFrom, customTo);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/plants/${plantId}/pnl?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load P&L");
        setPnl(null);
        return;
      }
      setPnl(json.pnl);
      setMeta({ from: json.from, to: json.to });
    } catch {
      setError("Network error");
      setPnl(null);
    } finally {
      setLoading(false);
    }
  }, [plantId, range, customFrom, customTo]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="range-toggle" role="group" aria-label="Date range">
        {(["daily", "weekly", "monthly", "custom"] as RangeKey[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={range === key}
            onClick={() => setRange(key)}
          >
            {key[0]!.toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {range === "custom" ? (
        <div className="form-grid two" style={{ marginBottom: "1rem" }}>
          <div className="field">
            <label htmlFor="from">From</label>
            <input
              id="from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="to">To</label>
            <input
              id="to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {meta ? (
        <p className="page-sub">
          {meta.from === meta.to ? meta.from : `${meta.from} → ${meta.to}`}
          {loading ? " · Loading…" : ""}
        </p>
      ) : null}

      {error ? <div className="alert alert--error">{error}</div> : null}

      {pnl ? (
        <div className="pnl-rows">
          {ROWS.map((row) => {
            const value = pnl[row.key];
            const isTotal = row.key === "grossProfit" || row.key === "netProfit";
            const className =
              value < 0 ? "neg" : row.tone === "pos" && value > 0 ? "pos" : "";
            return (
              <div
                key={row.key}
                className={`pnl-row${isTotal ? " pnl-row--total" : ""}`}
              >
                <span>{row.label}</span>
                <span className={className}>{formatINR(value)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
