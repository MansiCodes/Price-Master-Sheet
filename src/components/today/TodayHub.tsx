"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SlideOver } from "@/components/ui/SlideOver";
import { HubContactFields } from "@/components/today/hub/HubContactFields";
import { HubEntryTopRow } from "@/components/today/hub/HubEntryTopRow";
import { HubExpenseFields } from "@/components/today/hub/HubExpenseFields";
import { HubPurchaseFields } from "@/components/today/hub/HubPurchaseFields";
import { HubReportCard } from "@/components/today/hub/HubReportCard";
import { HubSaleFields } from "@/components/today/hub/HubSaleFields";
import { HubStockFields } from "@/components/today/hub/HubStockFields";
import { useTodayHub } from "@/components/today/hub/useTodayHub";
import type { TodayHubProps } from "@/components/today/today-hub-model";
import "./today-hub.css";

export type {
  ShiftKey,
  ShiftModulesMap,
  TodayModuleKey,
  TodayModuleStatus,
} from "@/components/today/today-hub-model";

export function TodayHub(props: TodayHubProps) {
  const { vm, t, tCommon, onSubmit } = useTodayHub(props);
  const { embedded, overlayOnly, flags, kind, session } = vm;

  return (
    <div
      className={`today-hub ${embedded ? "today-hub--embedded" : ""}${
        overlayOnly ? " today-hub--overlay-only" : ""
      }`}
    >
      <HubReportCard vm={vm} />
      <SlideOver
        open={session.panelOpen}
        onClose={session.closePanel}
        title={flags.stockEntryOnly ? "Stock" : t("title")}
        footer={
          <>
            <Button variant="secondary" onClick={session.closePanel}>
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              form="today-entry-form"
              disabled={session.saving}
            >
              {session.saving ? tCommon("saving") : tCommon("save")}
            </Button>
          </>
        }
      >
        {session.error ? <Alert type="error">{session.error}</Alert> : null}

        <form id="today-entry-form" className="form-grid" onSubmit={onSubmit}>
          <HubEntryTopRow vm={vm} t={t} tCommon={tCommon} />
          {kind === "purchase" ? <HubPurchaseFields vm={vm} /> : null}
          {kind === "sale" ? <HubSaleFields vm={vm} /> : null}
          {kind === "stock" ? <HubStockFields vm={vm} /> : null}
          {kind === "expense" ? <HubExpenseFields vm={vm} t={t} /> : null}
          {kind === "contactList" ? <HubContactFields vm={vm} /> : null}
          </form>
      </SlideOver>
    </div>
  );
}
