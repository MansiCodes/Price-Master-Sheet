"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ProductionEntryForm,
  type MachineCard,
  type SlotInfo,
} from "@/components/machine-production/ProductionEntryForm";
import { CardGridLoadingSkeleton } from "@/components/loading/CoreLoadingSkeleton";
import type { ShiftFilter, SlotStatus } from "@/lib/machine-production/slots";

type Counts = {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
};

export type ProcessCard = {
  id: string;
  name: string;
  machineCount: number;
  completed: number;
  pending: number;
  overdue: number;
  status: SlotStatus;
};

type ProcessLevel = {
  ok: boolean;
  level: "processes";
  shiftFilter: ShiftFilter;
  currentSlot: SlotInfo;
  viewSlot: SlotInfo;
  counts: Counts;
  processes: ProcessCard[];
  error?: string;
};

type MachineLevel = {
  ok: boolean;
  level: "machines";
  shiftFilter: ShiftFilter;
  currentSlot: SlotInfo;
  viewSlot: SlotInfo;
  process: { id: string; name: string };
  counts: Counts;
  machines: MachineCard[];
  error?: string;
};

type DashboardPayload = ProcessLevel | MachineLevel;

const SHIFT_TABS: {
  id: ShiftFilter;
  label: string;
  sublabel?: string;
}[] = [
  { id: "ALL", label: "All" },
  { id: "DAY", label: "Day", sublabel: "9AM–9PM" },
  { id: "NIGHT", label: "Night", sublabel: "9PM–9AM" },
];

function statusClass(status: SlotStatus) {
  if (status === "COMPLETED") return "mp-status--ok";
  if (status === "OVERDUE") return "mp-status--overdue";
  return "mp-status--pending";
}

/** Tints the whole card so a submitted slot is readable at a glance across the grid. */
function cardStatusClass(status: SlotStatus) {
  if (status === "COMPLETED") return "mp-machine-card--ok";
  if (status === "OVERDUE") return "mp-machine-card--overdue";
  return "mp-machine-card--pending";
}

const PROCESS_IMAGES = {
  drawing: "/machine-production/copper-drawing.jpg",
  extrusion: "/machine-production/extrusion-card.jpg",
  insulation: "/machine-production/insulation.jpg",
  twisting: "/machine-production/twisting.jpg",
  laying: "/machine-production/laying.jpg",
  steelTape: "/machine-production/steel-tape.jpg",
  armoured: "/machine-production/armoured.jpg",
  sheathing: "/machine-production/sheathing.jpg",
  braiding: "/machine-production/braiding.jpg",
  coiling: "/machine-production/coiling.jpg",
  annealing: "/machine-production/annealing.jpg",
} as const;

type ProcessImageRule = {
  image: (typeof PROCESS_IMAGES)[keyof typeof PROCESS_IMAGES];
  match: (text: string) => boolean;
};

const PROCESS_IMAGE_RULES: ProcessImageRule[] = [
  {
    image: PROCESS_IMAGES.drawing,
    match: (t) =>
      t.includes("drawing") ||
      t.includes("strip making") ||
      (t.includes("copper") &&
        !t.includes("anneal") &&
        !t.includes("bunch") &&
        !t.includes("tin")),
  },
  {
    image: PROCESS_IMAGES.annealing,
    match: (t) =>
      t.includes("anneal") || t.includes("tinning") || t.includes("tinned"),
  },
  {
    image: PROCESS_IMAGES.extrusion,
    match: (t) =>
      t.includes("extrusion") ||
      t.includes("extruder") ||
      t.includes("extrud") ||
      /(^|[^a-z])ext([\s_-]|$|\d)/.test(t),
  },
  {
    image: PROCESS_IMAGES.insulation,
    match: (t) => t.includes("insulation") || t.includes("insulat"),
  },
  {
    image: PROCESS_IMAGES.twisting,
    match: (t) =>
      t.includes("twisting") ||
      t.includes("twister") ||
      t.includes("twist") ||
      t.includes("quadding") ||
      t.includes("buncher") ||
      t.includes("bunch") ||
      /(^|[^a-z])tw([\s_-]|$|\d)/.test(t),
  },
  {
    image: PROCESS_IMAGES.laying,
    match: (t) => t.includes("laying") || t.includes("jelly"),
  },
  {
    image: PROCESS_IMAGES.steelTape,
    match: (t) =>
      t.includes("steel tape") ||
      t.includes("dst") ||
      t.includes("tapping") ||
      t.includes("strip rewind"),
  },
  {
    image: PROCESS_IMAGES.armoured,
    match: (t) =>
      t.includes("armoured") ||
      t.includes("armored") ||
      t.includes("armour") ||
      t.includes("armor"),
  },
  {
    image: PROCESS_IMAGES.sheathing,
    match: (t) =>
      t.includes("sheathing") ||
      t.includes("sheather") ||
      t.includes("sheath") ||
      /(^|[^a-z])osh([\s_-]|$)/.test(t) ||
      /(^|[^a-z])sh([\s_-]|$|\d)/.test(t),
  },
  {
    image: PROCESS_IMAGES.braiding,
    match: (t) => t.includes("braiding") || t.includes("braid"),
  },
  {
    image: PROCESS_IMAGES.coiling,
    match: (t) =>
      t.includes("coiling") ||
      t.includes("coil") ||
      t.includes("packing") ||
      t.includes("rewinding") ||
      t.includes("loading") ||
      t.includes("stacking"),
  },
];

/** Pick process/machine card art from labels; always returns an image. */
function resolveProcessImage(
  ...parts: Array<string | null | undefined>
): string {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (text) {
    for (const rule of PROCESS_IMAGE_RULES) {
      if (rule.match(text)) return rule.image;
    }
  }
  return PROCESS_IMAGES.extrusion;
}

export function SupervisorDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processFromUrl = searchParams.get("processId");

  const [shift, setShift] = useState<ShiftFilter>("ALL");
  const [processId, setProcessId] = useState<string | null>(processFromUrl);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MachineCard | null>(null);

  useEffect(() => {
    setProcessId(processFromUrl);
  }, [processFromUrl]);

  const selectProcess = useCallback(
    (id: string | null) => {
      setProcessId(id);
      const sp = new URLSearchParams(searchParams.toString());
      if (id) sp.set("processId", id);
      else sp.delete("processId");
      const q = sp.toString();
      router.replace(q ? `/machine-production?${q}` : "/machine-production");
    },
    [router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ shift });
      if (processId) sp.set("processId", processId);
      const res = await fetch(`/api/machine-production/dashboard?${sp}`);
      const json = (await res.json()) as DashboardPayload;
      if (!res.ok) {
        setError(json.error ?? "Failed to load dashboard");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [shift, processId]);

  useEffect(() => {
    void load();
  }, [load]);

  const viewSlot = data?.viewSlot ?? null;
  const inProcess = data?.level === "machines" ? data : null;

  return (
    <div className="mp-root">
      {inProcess ? (
        <nav className="mp-breadcrumb" aria-label="Breadcrumb">
          <button
            type="button"
            className="mp-breadcrumb__back"
            onClick={() => selectProcess(null)}
          >
            ← All processes
          </button>
          <span className="mp-breadcrumb__sep">/</span>
          <span className="mp-breadcrumb__current">
            {inProcess.process.name}
          </span>
        </nav>
      ) : null}

      <div className="mp-toolbar">
        <div
          className="mp-shift-tabs mp-shift-tabs--shifts"
          role="tablist"
          aria-label="Shift"
        >
          {SHIFT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={shift === tab.id}
              aria-label={
                tab.sublabel ? `${tab.label} (${tab.sublabel})` : tab.label
              }
              className={
                shift === tab.id
                  ? "mp-shift-tab mp-shift-tab--active"
                  : "mp-shift-tab"
              }
              onClick={() => setShift(tab.id)}
            >
              <span className="mp-shift-tab__label">{tab.label}</span>
              {tab.sublabel ? (
                <span className="mp-shift-tab__sub">{tab.sublabel}</span>
              ) : null}
            </button>
          ))}
        </div>

        {viewSlot ? (
          <div className="mp-slot-banner">
            <div>
              <p className="mp-slot-banner__label">Current slot</p>
              <p className="mp-slot-banner__value">
                {viewSlot.shift === "DAY" ? "Day" : "Night"} ·{" "}
                {viewSlot.slotLabel}
              </p>
            </div>
            <div>
              <p className="mp-slot-banner__label">Deadline</p>
              <p className="mp-slot-banner__value">{viewSlot.deadlineLabel}</p>
            </div>
            <div>
              <p className="mp-slot-banner__label">Date</p>
              <p className="mp-slot-banner__value">{viewSlot.entryDate}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mp-board">
      {data ? (
        <div className="mp-counts">
          <span className="mp-count">Total {data.counts.total}</span>
          <span className="mp-count mp-count--ok">
            Completed {data.counts.completed}
          </span>
          <span className="mp-count mp-count--pending">
            Pending {data.counts.pending}
          </span>
          <span className="mp-count mp-count--overdue">
            Overdue {data.counts.overdue}
          </span>
        </div>
      ) : null}

      {loading ? (
        <CardGridLoadingSkeleton
          cards={8}
          label="Loading machine production"
          showChrome={false}
        />
      ) : null}
      {error ? <p className="mp-error">{error}</p> : null}

      {!loading && data?.level === "processes" ? (
        <div className="mp-machine-grid mp-machine-grid--processes">
          {data.processes.length === 0 ? (
            <p className="mp-muted">
              No processes yet. Ask an Admin to add processes and assign
              machines to them.
            </p>
          ) : (
            data.processes.map((p) => {
              const imageSrc = resolveProcessImage(p.name);
              return (
              <button
                key={p.id}
                type="button"
                className={`mp-machine-card mp-machine-card--process ${cardStatusClass(p.status)}`}
                onClick={() => selectProcess(p.id)}
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
      ) : null}

      {!loading && data?.level === "machines" ? (
        <div className="mp-machine-grid">
          {data.machines.length === 0 ? (
            <p className="mp-muted">
              No active machines in this process. Ask an Admin to assign
              machines to it.
            </p>
          ) : (
            data.machines.map((m) => {
              const imageSrc = resolveProcessImage(
                data.process.name,
                m.code,
                m.name,
                m.description,
              );
              return (
              <button
                key={m.id}
                type="button"
                className={`mp-machine-card mp-machine-card--process ${cardStatusClass(m.status)}`}
                onClick={() => setSelected(m)}
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
      ) : null}
      </div>

      <ProductionEntryForm
        open={Boolean(selected)}
        machine={selected}
        viewSlot={viewSlot}
        processName={inProcess?.process.name ?? null}
        onClose={() => setSelected(null)}
        onSaved={() => void load()}
      />
    </div>
  );
}
