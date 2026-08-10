type CompletionCardProps = {
  completed: number;
  total: number;
  title: string;
  subtitle: string;
};

/** Progress summary for the Today page's five daily forms. */
export function CompletionCard({
  completed,
  total,
  title,
  subtitle,
}: CompletionCardProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const done = total > 0 && completed >= total;

  return (
    <div className={`completion-card ${done ? "completion-card--done" : ""}`}>
      <div
        className="completion-ring"
        style={{ "--pct": pct } as React.CSSProperties}
      >
        <span className="completion-ring__inner">
          {completed}/{total}
        </span>
      </div>
      <div>
        <p className="completion-card__title">{title}</p>
        <p className="completion-card__sub">{subtitle}</p>
      </div>
    </div>
  );
}
