"use client";

import { useState } from "react";
import { PnlTabNav } from "@/components/pnl/PnlTabNav";
import { PnlDateFilter } from "@/components/pnl/PnlDateFilter";
import { PnlExportButton } from "@/components/pnl/PnlExportButton";
import { PnlReportTab } from "@/components/pnl/PnlReportTab";
import { SalesReport } from "@/components/pnl/SalesReport";
import { PurchaseReport } from "@/components/pnl/PurchaseReport";
import { ProductionReport } from "@/components/pnl/ProductionReport";
import { StockReport } from "@/components/pnl/StockReport";
import { ExpenseReport } from "@/components/pnl/ExpenseReport";
import { useReportRange } from "@/components/pnl/useReportRange";
import type { ReportTab } from "@/components/pnl/types";
import "@/components/pnl/pnl-reports.css";

export function PnlReportsShell({
  plantId,
}: {
  plantId: string;
  plantName?: string;
}) {
  const [tab, setTab] = useState<ReportTab>("pnl");
  const { from, to, setFrom, setTo } = useReportRange();

  return (
    <div className="pnl-reports">
      <div className="pnl-reports__toolbar">
        <div className="pnl-reports__tabs">
          <PnlTabNav active={tab} onChange={setTab} />
        </div>
        <div className="pnl-reports__actions">
          <PnlDateFilter
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
          <PnlExportButton
            plantId={plantId}
            kind={tab}
            from={from}
            to={to}
          />
        </div>
      </div>

      <div className="pnl-reports__body" role="tabpanel">
        {tab === "pnl" ? (
          <PnlReportTab plantId={plantId} from={from} to={to} />
        ) : null}
        {tab === "sales" ? (
          <SalesReport plantId={plantId} from={from} to={to} />
        ) : null}
        {tab === "purchase" ? (
          <PurchaseReport plantId={plantId} from={from} to={to} />
        ) : null}
        {tab === "production" ? (
          <ProductionReport plantId={plantId} from={from} to={to} />
        ) : null}
        {tab === "stock" ? (
          <StockReport plantId={plantId} from={from} to={to} />
        ) : null}
        {tab === "expense" ? (
          <ExpenseReport plantId={plantId} from={from} to={to} />
        ) : null}
      </div>
    </div>
  );
}
