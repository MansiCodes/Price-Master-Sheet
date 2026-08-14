export type StatChip = {
  label: string;
  value: string;
  tone?: "teal" | "amber" | "neutral";
};

/** Small row of colored info chips used atop the Home and Today pages. */
export function StatStrip({ items }: { items: StatChip[] }) {
  if (items.length === 0) return null;

  return (
    <div className="stat-strip">
      {items.map((item) => (
        <span
          key={item.label}
          className={`stat-chip stat-chip--${item.tone ?? "neutral"}`}
        >
          <span className="stat-chip__dot" aria-hidden="true" />
          {item.label}: {item.value}
        </span>
      ))}
    </div>
  );
}