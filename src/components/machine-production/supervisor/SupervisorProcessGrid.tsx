import { cardStatusClass, statusClass } from "@/components/machine-production/supervisor/supervisor-status";
import { resolveProcessImage } from "@/components/machine-production/supervisor/supervisor-process-images";
import type { ProcessCard } from "@/components/machine-production/supervisor/supervisor-types";

export function SupervisorProcessGrid({
  processes,
  searchQuery,
  onSelectProcess,
}: {
  processes: ProcessCard[];
  searchQuery: string;
  onSelectProcess: (id: string) => void;
}) {
  return (
    <div className="mp-machine-grid mp-machine-grid--processes">
      {processes.filter((p) =>
        searchQuery.trim() === "" ||
        p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      ).length === 0 ? (
        <p className="mp-muted">
          {searchQuery.trim()
            ? `No process found matching "${searchQuery}".`
            : "No processes yet. Ask an Admin to add processes and assign machines to them."}
        </p>
      ) : (
        processes
          .filter((p) =>
            searchQuery.trim() === "" ||
            p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
          )
          .map((p) => {
            const imageSrc = resolveProcessImage(p.name);
            return (
              <button
                key={p.id}
                type="button"
                className={`mp-machine-card mp-machine-card--process ${cardStatusClass(p.status)}`}
                onClick={() => onSelectProcess(p.id)}
              >
                {imageSrc ? (
                  <div className="mp-machine-card__media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageSrc} alt="" />
                  </div>
                ) : null}
                <div className="mp-machine-card__body">
                  <div className="mp-machine-card__top">
                    <span className="mp-machine-card__code">PROCESS</span>
                    <span className={`mp-status ${statusClass(p.status)}`}>
                      {p.status}
                    </span>
                  </div>
                  <h2 className="mp-machine-card__name">{p.name}</h2>
                  <p className="mp-machine-card__meta">
                    {p.completed} of {p.machineCount} submitted
                    {p.overdue > 0 ? ` · ${p.overdue} overdue` : ""}
                  </p>
                  <p className="mp-machine-card__cta">View machines →</p>
                </div>
              </button>
            );
          })
      )}
    </div>
  );
}
