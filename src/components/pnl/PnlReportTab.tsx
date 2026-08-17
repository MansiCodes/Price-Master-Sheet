"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlantPnlStatement } from "@/lib/pnl/types";
import {
  PnlStatement,
  PnlStatementSkeleton,
} from "@/components/pnl/PnlStatement";

export function PnlReportTab({
  plantId,
  from,
  to,
}: {
  plantId: string;
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

  return (
    <div>
      {error ? <div className="alert alert--error">{error}</div> : null}
      {loading ? (
        <PnlStatementSkeleton />
      ) : pnl ? (
        <PnlStatement
          trading={pnl.trading}
          indirect={pnl.indirect}
        />
      ) : null}
    </div>
  );
}
