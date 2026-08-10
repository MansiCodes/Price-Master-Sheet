"use client";

export function UsersTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <section className="users-table-card" aria-busy="true" aria-label="Loading users">
      <div className="users-skeleton">
        <div className="users-skeleton__head">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={`h-${i}`} className="users-skeleton__cell users-skeleton__cell--head" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div key={`r-${row}`} className="users-skeleton__row">
            <span className="users-skeleton__cell users-skeleton__cell--name">
              <span className="users-skeleton__avatar" />
              <span className="users-skeleton__line" style={{ width: "58%" }} />
            </span>
            <span className="users-skeleton__cell">
              <span className="users-skeleton__line" style={{ width: "72%" }} />
            </span>
            <span className="users-skeleton__cell">
              <span className="users-skeleton__pill" />
            </span>
            <span className="users-skeleton__cell">
              <span className="users-skeleton__pill" />
            </span>
            <span className="users-skeleton__cell">
              <span className="users-skeleton__pill" />
            </span>
            <span className="users-skeleton__cell">
              <span className="users-skeleton__btn" />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function UsersToolbarSkeleton() {
  return (
    <div className="users-toolbar users-toolbar--skeleton" aria-hidden>
      <span className="users-skeleton__search" />
      <span className="users-toolbar__spacer" />
      <span className="users-skeleton__icons">
        <span className="users-skeleton__icon" />
        <span className="users-skeleton__icon" />
        <span className="users-skeleton__icon" />
      </span>
    </div>
  );
}
