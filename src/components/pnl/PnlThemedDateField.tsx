"use client";

import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mi = Number(m) - 1;
  if (!y || mi < 0 || mi > 11 || !d) return iso;
  return `${d}-${months[mi]}-${y}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function PnlThemedDateField({
  id,
  label,
  value,
  min,
  max,
  align = "start",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min?: string;
  max?: string;
  align?: "start" | "end";
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
  const [year, setYear] = useState(parsed.getFullYear());
  const [month, setMonth] = useState(parsed.getMonth());

  useEffect(() => {
    if (!open) return;
    const base = value ? new Date(`${value}T00:00:00`) : new Date();
    setYear(base.getFullYear());
    setMonth(base.getMonth());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (!menu) return;
    menu.style.transform = "";
    const r = menu.getBoundingClientRect();
    let shift = 0;
    if (r.right > window.innerWidth - 8) shift = window.innerWidth - 8 - r.right;
    if (r.left + shift < 8) shift += 8 - (r.left + shift);
    menu.style.transform = shift ? `translateX(${shift}px)` : "";
  }, [open, year, month]);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="pnl-date-filter__field">
      <label htmlFor={id}>{label}</label>
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
            {value ? formatDisplay(value) : "dd-mmm-yyyy"}
          </span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </button>
        {open ? (
          <div className="pnl-date-picker__menu" role="dialog" aria-label={label} ref={menuRef}>
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
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={disabled}
                    className={`pnl-date-picker__day${selected ? " is-selected" : ""}`}
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
