import { MODULE_ICONS, MODULE_KIND, moduleScore } from "@/components/today/today-hub-model";
import type { TodayHubVm } from "@/components/today/hub/today-hub-view-model";

export function HubReportCheckItem({
  vm,
  mod,
}: {
  vm: TodayHubVm;
  mod: TodayHubVm["session"]["activeModules"][number];
}) {
  const { reportShift, openAdd } = vm.session;
  const icon = MODULE_ICONS[mod.key];
  return (
    <li key={`${reportShift}-${mod.key}`}>
      <button
        type="button"
        className={`today-check ${mod.filled ? "today-check--done" : ""}`}
        disabled={!vm.canEnter}
        onClick={() => openAdd(MODULE_KIND[mod.key], reportShift)}
      >
        <span className={`today-check__icon today-check__icon--${icon.tone}`}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={icon.path} />
          </svg>
        </span>
        <span className="today-check__label">{mod.label}</span>
        <span className="today-check__score">{moduleScore(mod)}</span>
        <span className="today-check__mark" aria-hidden />
      </button>
    </li>
  );
}

export function HubReportChecklist({ vm }: { vm: TodayHubVm }) {
  const { activeModules } = vm.session;
  return (
    <ul className="today-checklist">
      {activeModules.map((mod) => (
        <HubReportCheckItem key={`${vm.session.reportShift}-${mod.key}`} vm={vm} mod={mod} />
      ))}
    </ul>
  );
}
