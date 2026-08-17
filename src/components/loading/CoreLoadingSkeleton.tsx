export function DashboardLoadingSkeleton() {
  return (
    <div className="core-skeleton" aria-label="Loading dashboard">
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
    <div className="core-skeleton" aria-label="Loading P&L">
      <div className="core-skeleton__title" />
      <div className="core-skeleton__toolbar" />
      <div className="core-skeleton__table">
        {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
      </div>
    </div>
  );
}
