export function DashboardLoadingSkeleton() {
  return (
    <div className="core-skeleton" aria-busy="true" aria-label="Loading dashboard">
      <div className="core-skeleton__title" />
      <div className="core-skeleton__cards">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="core-skeleton__card" key={index}>
            <span /><span /><span />
          </div>
        ))}
      </div>
      <div className="core-skeleton__columns">
        <div className="core-skeleton__panel" />
        <div className="core-skeleton__panel" />
      </div>
    </div>
  );
}

export function PnlRouteLoadingSkeleton() {
  return (
    <div className="core-skeleton" aria-busy="true" aria-label="Loading P&L">
      <div className="core-skeleton__title" />
      <div className="core-skeleton__toolbar" />
      <div className="core-skeleton__table">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}

export function TablePageLoadingSkeleton({
  rows = 8,
  label = "Loading",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div className="core-skeleton" aria-busy="true" aria-label={label}>
      <div className="core-skeleton__title" />
      <div className="core-skeleton__toolbar" />
      <div className="core-skeleton__table">
        {Array.from({ length: rows }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}

export function FormPageLoadingSkeleton({
  label = "Loading form",
}: {
  label?: string;
}) {
  return (
    <div className="core-skeleton" aria-busy="true" aria-label={label}>
      <div className="core-skeleton__title" />
      <div className="core-skeleton__toolbar" />
      <div className="core-skeleton__form">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}

export function CardGridLoadingSkeleton({
  cards = 8,
  label = "Loading",
}: {
  cards?: number;
  label?: string;
}) {
  return (
    <div className="core-skeleton" aria-busy="true" aria-label={label}>
      <div className="core-skeleton__title" />
      <div className="core-skeleton__toolbar" />
      <div className="core-skeleton__counts">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className="core-skeleton__grid">
        {Array.from({ length: cards }, (_, index) => (
          <div className="core-skeleton__grid-card" key={index}>
            <span className="core-skeleton__grid-media" />
            <span /><span /><span />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MachineProductionAdminSkeleton() {
  return (
    <div
      className="core-skeleton"
      aria-busy="true"
      aria-label="Loading machine production admin"
    >
      <div className="core-skeleton__title" />
      <div className="core-skeleton__tabs">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className="core-skeleton__cards core-skeleton__cards--four">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="core-skeleton__card" key={index}>
            <span /><span /><span />
          </div>
        ))}
      </div>
      <div className="core-skeleton__toolbar" />
      <div className="core-skeleton__table">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}
