import type { MachineCard } from "@/components/machine-production/ProductionEntryForm";
import { cardStatusClass, statusClass } from "@/components/machine-production/supervisor/supervisor-status";
import { resolveProcessImage } from "@/components/machine-production/supervisor/supervisor-process-images";

export function SupervisorMachineGrid({
  machines,
  processName,
  onSelectMachine,
}: {
  machines: MachineCard[];
  processName: string;
  onSelectMachine: (machine: MachineCard) => void;
}) {
  return (
    <div className="mp-machine-grid">
      {machines.length === 0 ? (
        <p className="mp-muted">
          No active machines in this process. Ask an Admin to assign
          machines to it.
        </p>
      ) : (
        machines.map((m) => {
          const imageSrc = resolveProcessImage(
            processName,
            m.code,
            m.name,
            m.description,
          );
          return (
          <button
            key={m.id}
            type="button"
            className={`mp-machine-card mp-machine-card--process ${cardStatusClass(m.status)}`}
            onClick={() => onSelectMachine(m)}
          >
            {imageSrc ? (
              <div className="mp-machine-card__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageSrc} alt="" />
              </div>
            ) : null}
            <div className="mp-machine-card__body">
              <div className="mp-machine-card__top">
                <span className="mp-machine-card__code">{m.code}</span>
                <span className={`mp-status ${statusClass(m.status)}`}>
                  {m.status}
                </span>
              </div>
              <h2 className="mp-machine-card__name">{m.name}</h2>
              {m.description ? (
                <p className="mp-machine-card__desc">{m.description}</p>
              ) : null}
              {m.status === "COMPLETED" ? (
                <>
                  <p className="mp-machine-card__meta">
                    Actual{" "}
                    {m.totalActualProduction ?? m.actualProduction ?? "—"}
                    {m.entryCount && m.entryCount > 1
                      ? ` (${m.entryCount} entries)`
                      : ""}{" "}
                    · Eff{" "}
                    {m.efficiencyPct != null ? `${m.efficiencyPct}%` : "—"}
                  </p>
                  <p className="mp-machine-card__cta">
                    Add another entry →
                  </p>
                </>
              ) : (
                <p className="mp-machine-card__cta">Open production form →</p>
              )}
            </div>
          </button>
          );
        })
      )}
    </div>
  );
}
