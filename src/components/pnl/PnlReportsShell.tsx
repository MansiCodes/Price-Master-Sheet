"use client";

import { useEffect, useMemo, useState } from "react";
import { PnlTabNav } from "@/components/pnl/PnlTabNav";
import { PnlDateFilter } from "@/components/pnl/PnlDateFilter";
import { PnlExportButton } from "@/components/pnl/PnlExportButton";
import { PnlImportButton } from "@/components/pnl/PnlImportButton";
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
  canImport = false,
}: {
  plantId: string;
  plantName?: string;
  plantCode?: string;
  plantManagerName?: string | null;
  isSuperAdmin?: boolean;
  userRole?: string;
  canImport?: boolean;
}) {
  const [tab, setTab] = useState<ReportTab>(
    userRole === "ACCOUNTANT" ? "sales" : "pnl",
  );
  const [reloadKey, setReloadKey] = useState(0);
  const pvc = plantCode?.toUpperCase() === "PVC";
  const accountantLimited = userRole === "ACCOUNTANT";

  const { from, to, setFrom, setTo } = useReportRange();

  const allowedTabs = useMemo<ReportTab[]>(() => {
    if (accountantLimited) {
      return ["sales", "purchase"];
    }
    return pvc
      ? ["pnl", "sales", "purchase", "stock", "expense", "contactList"]
      : ["pnl", "sales", "purchase", "stock", "expense", "fixedAssets", "contactList"];
  }, [pvc, accountantLimited]);

  useEffect(() => {
    if (!allowedTabs.includes(tab)) {
      setTab(accountantLimited ? "sales" : "pnl");
    }
  }, [allowedTabs, tab, accountantLimited]);

  const allowImport = canImport;

  const exportFrom = tab === "factoryRent" ? "2026-01-01" : from;
  const exportTo = tab === "factoryRent" ? "2027-03-31" : to;

  return (
    <div className="pnl-reports">
      <div className="pnl-reports__header">
        {plantName ? (
          <div className="pnl-reports__plant-block">
            <p className="pnl-reports__plant">{plantName}</p>
            {!accountantLimited && plantManagerName ? (
              <p className="pnl-reports__manager">
                Plant manager · {plantManagerName}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="pnl-reports__plant-block" />
        )}
        <div className="pnl-reports__import-row">
          <PnlImportButton
            plantId={plantId}
            canImport={allowImport}
            salesPurchaseOnly={accountantLimited}
            onImported={() => setReloadKey((k) => k + 1)}
          />
        </div>
        <div className="pnl-reports__header-export">
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
        </div>
      </div>

      <div className="pnl-reports__body" role="tabpanel" key={reloadKey}>
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
