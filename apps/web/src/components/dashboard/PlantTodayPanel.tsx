import Link from "next/link";
import type { FormFillBar, PlantTodayRow } from "@/lib/dashboard/metrics";
import { DonutChart } from "@/components/dashboard/Charts";

type Props = {
  today: string;
  plants: PlantTodayRow[];
  formBars: FormFillBar[];
  weekCompletion: number[];
  primaryPlantId: string | null;
};

/** Horizontal fill bars for the 5 daily forms. */
function FormFillChart({
  bars,
  primaryPlantId,
}: {
  bars: FormFillBar[];
  primaryPlantId: string | null;
}) {
  return (
    <div className="form-fill-chart" role="list">
      {bars.map((bar) => {
        const pct =
          bar.total > 0 ? Math.round((bar.filled / bar.total) * 100) : 0;
        const href = primaryPlantId
          ? `/plants/${primaryPlantId}/${bar.hrefSuffix}`
          : "#";
        return (
          <Link
            key={bar.label}
            href={href}
            className="form-fill-chart__row"
            role="listitem"
          >
            <span className="form-fill-chart__label">{bar.label}</span>
            <span className="form-fill-chart__track">
              <span
                className="form-fill-chart__fill"
                style={{ width: `${pct}%`, background: bar.color }}
              />
            </span>
            <span className="form-fill-chart__meta">
              {bar.filled}/{bar.total}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** Area-style completion spark for last 7 days. */
function WeekCompletionChart({ values }: { values: number[] }) {
  const w = 280;
  const h = 72;
  const max = 100;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = h - 8 - (Math.max(0, Math.min(100, v)) / max) * (h - 16);
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${h} ${points} ${w},${h}`;

  return (
    <svg
      className="week-completion-chart"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="7-day plant today completion"
    >
      <defs>
        <linearGradient id="todayArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#todayArea)" />
      <polyline
        points={points}
        fill="none"
        stroke="#0d9488"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {values.map((v, i) => {
        const x = i * step;
        const y = h - 8 - (Math.max(0, Math.min(100, v)) / max) * (h - 16);
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#0f766e" />;
      })}
    </svg>
  );
}

function PlantRingCard({ plant }: { plant: PlantTodayRow }) {
  const pct = Math.round((plant.completed / plant.total) * 100);
  return (
    <article className="plant-today-card">
      <div className="plant-today-card__head">
        <div>
          <h3 className="plant-today-card__name">{plant.name}</h3>
          <p className="plant-today-card__code">{plant.code}</p>
        </div>
        <DonutChart
          value={pct}
          color={plant.allComplete ? "#0d9488" : "#d97706"}
          label={plant.allComplete ? "Done" : "Open"}
        />
      </div>
      <div className="plant-today-card__modules">
        {plant.modules.map((mod) => (
          <Link
            key={mod.key}
            href={`/plants/${plant.id}/${mod.href}`}
            className={`plant-mod-chip ${
              mod.filled ? "plant-mod-chip--on" : "plant-mod-chip--off"
            }`}
            style={
              mod.filled
                ? { borderColor: mod.color, color: mod.color }
                : undefined
            }
          >
            <span
              className="plant-mod-chip__dot"
              style={{ background: mod.filled ? mod.color : "#d6d3d1" }}
            />
            {mod.label}
          </Link>
        ))}
      </div>
      <Link className="btn btn-secondary plant-today-card__cta" href={`/plants/${plant.id}/today`}>
        Open Plant Today
      </Link>
    </article>
  );
}

export function PlantTodayPanel({
  today,
  plants,
  formBars,
  weekCompletion,
  primaryPlantId,
}: Props) {
  if (plants.length === 0) {
    return (
      <section className="dash-panel">
        <h2 className="section-label" style={{ marginTop: 0 }}>
          Plant Today
        </h2>
        <p className="page-sub">No plant access — checklist will appear here once assigned.</p>
      </section>
    );
  }

  const totalDone = plants.reduce((s, p) => s + p.completed, 0);
  const totalSlots = plants.length * 5;
  const overallPct =
    totalSlots > 0 ? Math.round((totalDone / totalSlots) * 100) : 0;

  return (
    <section className="plant-today-panel">
      <div className="dash-panel__head">
        <div>
          <h2 className="section-label" style={{ margin: 0 }}>
            Plant Today
          </h2>
          <p className="page-sub" style={{ margin: "0.25rem 0 0" }}>
            Daily 5-form checklist · {today}
          </p>
        </div>
        <DonutChart value={overallPct} color="#0d9488" label="Overall" />
      </div>

      <div className="plant-today-grid">
        <div className="dash-panel plant-today-grid__chart">
          <h3 className="plant-today-subhead">Forms filled today</h3>
          <FormFillChart bars={formBars} primaryPlantId={primaryPlantId} />
        </div>
        <div className="dash-panel plant-today-grid__chart">
          <h3 className="plant-today-subhead">7-day checklist completion</h3>
          <WeekCompletionChart values={weekCompletion} />
          <div className="legend" style={{ marginTop: "0.5rem" }}>
            <span className="legend__item legend__item--teal">% forms done</span>
          </div>
        </div>
      </div>

      <div className="plant-today-cards">
        {plants.map((plant) => (
          <PlantRingCard key={plant.id} plant={plant} />
        ))}
      </div>
    </section>
  );
}
