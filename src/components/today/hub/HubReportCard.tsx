import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";
import { HubReportCardHeader, HubReportShiftToggle } from "@/components/today/hub/HubReportCardHeader";
import { HubReportChecklist } from "@/components/today/hub/HubReportChecklist";

export function HubReportCard({ vm }: { vm: TodayHubVm }) {
  const { overlayOnly, canEnter, session } = vm;
  if (overlayOnly) return <HubReportCardHeader vm={vm} />;
  return (
    <>
      <HubReportCardHeader vm={vm} />
      <section className="today-card">
        <div className="today-card__head">
          <div className="today-card__head-main">
            <h2 className="today-card__title">Today&apos;s report</h2>
            <span className="today-card__progress">
              {session.activeCompleted}/{session.activeModules.length}
            </span>
          </div>
          <HubReportShiftToggle vm={vm} />
        </div>
        <HubReportChecklist vm={vm} />
        {!canEnter ? (
          <p className="page-sub" style={{ marginTop: "1rem", marginBottom: 0 }}>
            Viewer access — entries are read-only.
          </p>
        ) : null}
      </section>
    </>
  );
}
