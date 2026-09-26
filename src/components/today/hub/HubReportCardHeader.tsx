import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

export function HubReportCardHeader({ vm }: { vm: TodayHubVm }) {
  const { embedded, overlayOnly, plantName, plantCode, date } = vm;
  if (embedded || overlayOnly) return null;
  return (
    <header className="today-hub__header">
      <div>
        <h1 className="today-hub__plant">{plantName}</h1>
        <p className="today-hub__meta">
          {plantCode} · {date}
        </p>
      </div>
      <span className="today-hub__deadline">Deadline 9:00 PM</span>
    </header>
  );
}

export function HubReportShiftToggle({ vm }: { vm: TodayHubVm }) {
  const { reportShift, setReportShift } = vm.session;
  return (
    <div className="shift-toggle today-card__shift-toggle" role="group" aria-label="Shift">
      <button type="button" className={reportShift === "DAY" ? "is-active" : ""} onClick={() => setReportShift("DAY")}>
        Day
      </button>
      <button type="button" className={reportShift === "NIGHT" ? "is-active" : ""} onClick={() => setReportShift("NIGHT")}>
        Night
      </button>
    </div>
  );
}
