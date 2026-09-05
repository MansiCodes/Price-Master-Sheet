"use client";

export function AuditToolbarSkeleton() {
  return (
    <div className="audit-toolbar audit-toolbar--skeleton" aria-hidden>
      <span className="audit-skeleton__search" />
      <span className="audit-toolbar__spacer" />
      <span className="audit-skeleton__icons">
        <span className="audit-skeleton__icon" />
        <span className="audit-skeleton__icon" />
      </span>
    </div>
  );
}

export function AuditTableSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <section className="audit-table-card" aria-busy="true" aria-label="Loading audit trail">
      <div className="audit-skeleton">
        <div className="audit-skeleton__head">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={`h-${i}`} className="audit-skeleton__cell audit-skeleton__cell--head" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div key={`r-${row}`} className="audit-skeleton__row">
            <span className="audit-skeleton__line" style={{ width: "70%" }} />
            <span className="audit-skeleton__line" style={{ width: "58%" }} />
            <span className="audit-skeleton__pill" />
            <span className="audit-skeleton__line" style={{ width: "40%" }} />
            <span className="audit-skeleton__pill" />
            <span className="audit-skeleton__line" style={{ width: "80%" }} />
          </div>
        ))}
      </div>
    </section>
  );
}
