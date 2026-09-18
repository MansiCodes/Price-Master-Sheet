"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlantPnlStatement } from "@/lib/pnl/types";
import {
  PnlStatement,
  PnlStatementSkeleton,
} from "@/components/pnl/PnlStatement";

export function PnlReportTab({
  plantId,
  plantCode,
  from,
  to,
}: {
  plantId: string;
  plantCode?: string;
  plantName?: string;
  from: string;
  to: string;
}) {
  const [pnl, setPnl] = useState<PlantPnlStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      const res = await fetch(
        `/api/plants/${plantId}/pnl${qs ? `?${qs}` : ""}`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load P&L");
        setPnl(null);
        return;
      }
      setPnl(json.pnl);
    } catch {
      setError("Network error");
      setPnl(null);
    } finally {
      setLoading(false);
    }
  }, [plantId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasData =
    pnl &&
    (pnl.salesRevenue > 0 ||
      pnl.purchases > 0 ||
      pnl.openingStock > 0 ||
      pnl.closingStock > 0 ||
      pnl.pettyCash > 0 ||
      pnl.electricity > 0 ||
      pnl.rent > 0 ||
      pnl.manpower > 0 ||
      pnl.grossProfit !== 0 ||
      pnl.netProfit !== 0);

  return (
    <div>
      {error ? <div className="alert alert--error">{error}</div> : null}
      {loading ? (
        <PnlStatementSkeleton />
      ) : hasData ? (
        <PnlStatement
          plantCode={plantCode}
          trading={pnl.trading}
          indirect={pnl.indirect}
        />
      ) : (
        <div
          className="stock-status-card"
          style={{
            padding: "2.5rem 1rem",
            textAlign: "center",
            color: "#6b7280",
            fontWeight: 500,
          }}
        >
          No records in this date range.
        </div>
      )}
    </div>
  );
}
