"use client";

import { useEffect, useMemo, useState } from "react";
import { PnlTabNav } from "@/components/pnl/PnlTabNav";
import { PnlDateFilter } from "@/components/pnl/PnlDateFilter";
import { PnlExportButton } from "@/components/pnl/PnlExportButton";
import { PnlReportTab } from "@/components/pnl/PnlReportTab";
import { SalesReport } from "@/components/pnl/SalesReport";
import { PurchaseReport } from "@/components/pnl/PurchaseReport";
import { StockReport } from "@/components/pnl/StockReport";
import { ExpenseReport } from "@/components/pnl/ExpenseReport";
import { ElectricityRentReport } from "@/components/pnl/ElectricityRentReport";
import { FixedAssetsReport } from "@/components/pnl/FixedAssetsReport";
import { PvcExpenseRegisterReport } from "@/components/pnl/PvcExpenseRegisterReport";
import { ContactListReport } from "@/components/pnl/ContactListReport";
import { useReportRange } from "@/components/pnl/useReportRange";
import type { ReportTab } from "@/components/pnl/types";
import "@/components/pnl/pnl-reports.css";

export function PnlReportsShell({
  plantId,
  plantName,
  plantCode,
  plantManagerName,
  isSuperAdmin = false,
  userRole,
}: {
  plantId: string;
  plantName?: string;
  plantCode?: string;
  plantManagerName?: string | null;
  isSuperAdmin?: boolean;
  userRole?: string;
}) {
  const [tab, setTab] = useState<ReportTab>("pnl");
  const pvc = plantCode?.toUpperCase() === "PVC";

  const { from, to, setFrom, setTo } = useReportRange();

  const allowedTabs = useMemo<ReportTab[]>(
    () =>
      pvc
        ? ["pnl", "sales", "purchase", "stock", "expense", "contactList"]
        : ["pnl", "sales", "purchase", "stock", "expense", "fixedAssets", "contactList"],
    [pvc],
  );

  useEffect(() => {
    if (!allowedTabs.includes(tab)) setTab("pnl");
  }, [allowedTabs, tab]);

  const exportFrom = tab === "factoryRent" ? "2026-01-01" : from;
  const exportTo = tab === "factoryRent" ? "2027-03-31" : to;

  return (
    <div className="pnl-reports">
      <div className="pnl-reports__header">
        {plantName ? (
          <div className="pnl-reports__plant-block">
            <p className="pnl-reports__plant">{plantName}</p>
            {plantManagerName ? (
              <p className="pnl-reports__manager">
                Plant manager · {plantManagerName}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="pnl-reports__plant-block" />
        )}
        <div className="pnl-reports__export pnl-reports__export--mobile">
          <PnlExportButton
            plantId={plantId}
            kind={tab}
            from={exportFrom}
            to={exportTo}
          />
        </div>
      </div>

      <div className="pnl-reports__toolbar">
        <div className="pnl-reports__tabs">
          <PnlTabNav active={tab} onChange={setTab} tabs={allowedTabs} />
        </div>
        <div className="pnl-reports__actions">
          {tab === "factoryRent" ? null : (
            <PnlDateFilter
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
          )}
          <div className="pnl-reports__export pnl-reports__export--desktop">
            <PnlExportButton
              plantId={plantId}
              kind={tab}
              from={exportFrom}
              to={exportTo}
            />
          </div>
        </div>
      </div>

      <div className="pnl-reports__body" role="tabpanel">
        {tab === "pnl" ? (
          <PnlReportTab
            plantId={plantId}
            plantCode={plantCode}
            from={from}
            to={to}
          />
        ) : null}
        {tab === "sales" ? (
          <SalesReport plantId={plantId} plantCode={plantCode} from={from} to={to} userRole={userRole} />
        ) : null}
        {tab === "purchase" ? (
          <PurchaseReport plantId={plantId} plantCode={plantCode} from={from} to={to} userRole={userRole} />
        ) : null}
        {tab === "stock" ? (
          <StockReport
            plantId={plantId}
            plantCode={plantCode}
            from={from}
            to={to}
            userRole={userRole}
          />
        ) : null}
        {tab === "expense" ? (
          pvc ? (
            <PvcExpenseRegisterReport plantId={plantId} from={from} to={to} />
          ) : (
            <ExpenseReport plantId={plantId} plantCode={plantCode} from={from} to={to} userRole={userRole} />
          )
        ) : null}
        {tab === "electricityRent" ? (
          <ElectricityRentReport
            plantId={plantId}
            plantCode={plantCode}
            from={from}
            to={to}
            section="combined"
          />
        ) : null}
        {tab === "fixedAssets" ? (
          <FixedAssetsReport plantId={plantId} from={from} to={to} />
        ) : null}
        {tab === "contactList" ? (
          <ContactListReport plantId={plantId} />
        ) : null}
      </div>
    </div>
  );
}
