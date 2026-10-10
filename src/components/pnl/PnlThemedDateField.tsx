"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISO(year: number, monthIndex: number, day: number) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function formatDisplay(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  const month = MONTHS_SHORT[Number(m) - 1];
  const day = Number(d);
  if (!month || !Number.isFinite(day) || day < 1) return iso;
  return `${day} ${month} ${y}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

const MENU_WIDTH = 260;
const MENU_HEIGHT = 320;
const EDGE = 16;
const GAP = 8;

function measureMenu(trigger: HTMLElement, alignEnd: boolean) {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(MENU_WIDTH, window.innerWidth - EDGE * 2);
  let left = alignEnd ? rect.right - width : rect.left;
  left = Math.min(left, window.innerWidth - EDGE - width);
  left = Math.max(EDGE, left);
  const spaceBelow = window.innerHeight - rect.bottom - GAP - EDGE;
  const spaceAbove = rect.top - GAP - EDGE;
  const openUp = spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow;
  const top = openUp
    ? Math.max(EDGE, rect.top - GAP - Math.min(MENU_HEIGHT, spaceAbove))
    : rect.bottom + GAP;
  return { top, left, width };
}

export function PnlThemedDateField({
  id,
  label,
  value,
  min,
  max,
  align = "start",
  hideLabel = false,
  required = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min?: string;
  max?: string;
  align?: "start" | "end";
  hideLabel?: boolean;
  required?: boolean;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
  const [year, setYear] = useState(parsed.getFullYear());
  const [month, setMonth] = useState(parsed.getMonth());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    setYear(base.getFullYear());
    setMonth(base.getMonth());
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = rootRef.current;
    if (!el) return;
    function place() {
      const node = rootRef.current;
      if (!node) return;
      setPos(measureMenu(node, align === "end"));
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align, year, month]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayIso = toISO(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );
  const todayDisabled = Boolean((min && todayIso < min) || (max && todayIso > max));

  return (
    <div className={hideLabel ? undefined : "pnl-date-filter__field"}>
      {hideLabel ? null : <label htmlFor={id}>{label}</label>}
      <div className={`pnl-date-picker${align === "end" ? " pnl-date-picker--end" : ""}`} ref={rootRef}>
        <button
          id={id}
          type="button"
          className="pnl-date-picker__trigger"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={value ? "" : "is-placeholder"}>
            {value ? formatDisplay(value) : "Select date"}
          </span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </button>
        {mounted && open && pos
          ? createPortal(
          <div
            className="pnl-date-picker__menu pnl-date-picker__menu--portal"
            role="dialog"
            aria-label={label}
            ref={menuRef}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            <div className="pnl-date-picker__nav">
              <button
                type="button"
                className="pnl-date-picker__nav-btn"
                aria-label="Previous month"
                onClick={() => {
                  const next = shiftMonth(year, month, -1);
                  setYear(next.year);
                  setMonth(next.month);
                }}
              >
                ‹
              </button>
              <p className="pnl-date-picker__month">
                {MONTHS[month]} {year}
              </p>
              <button
                type="button"
                className="pnl-date-picker__nav-btn"
                aria-label="Next month"
                onClick={() => {
                  const next = shiftMonth(year, month, 1);
                  setYear(next.year);
                  setMonth(next.month);
                }}
              >
                ›
              </button>
            </div>
            <div className="pnl-date-picker__week">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="pnl-date-picker__grid">
              {cells.map((day, i) => {
                if (day == null) return <span key={`e-${i}`} />;
                const iso = toISO(year, month, day);
                const disabled = Boolean((min && iso < min) || (max && iso > max));
                const selected = iso === value;
                const isToday = iso === todayIso;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={disabled}
                    className={`pnl-date-picker__day${selected ? " is-selected" : ""}${isToday && !selected ? " is-today" : ""}`}
                    onClick={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="pnl-date-picker__footer">
              {required ? (
                <span />
              ) : (
                <button
                  type="button"
                  className="pnl-date-picker__footer-btn"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="pnl-date-picker__footer-btn pnl-date-picker__footer-btn--today"
                disabled={todayDisabled}
                onClick={() => {
                  onChange(todayIso);
                  setOpen(false);
                }}
              >
                Today
              </button>
            </div>
          </div>,
            document.body,
          )
          : null}
      </div>
    </div>
  );
}
