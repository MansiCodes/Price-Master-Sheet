"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

export type MachineOption = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type MachineMultiSelectProps = {
  id?: string;
  machines: MachineOption[];
  value: string[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  onChange: (machineIds: string[]) => void;
};

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

export function MachineMultiSelect({
  id,
  machines,
  value,
  disabled = false,
  required,
  placeholder = "Select machines…",
  searchPlaceholder = "Search machines…",
  onChange,
}: MachineMultiSelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");

  const displayValue = useMemo(() => {
    if (value.length === 0) return "";
    const names = machines
      .filter((m) => value.includes(m.id))
      .map((m) => m.name);
    if (names.length <= 2) return names.join(", ");
    return `${names.length} machines selected`;
  }, [value, machines]);

  const filteredMachines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return machines;
    return machines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q),
    );
  }, [machines, search]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  function updatePosition() {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(320, openUp ? spaceAbove : spaceBelow));
    setPos({
      top: openUp ? rect.top - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      maxHeight,
      openUp,
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    function onReposition() {
      updatePosition();
    }
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function toggleMachine(machineId: string) {
    if (value.includes(machineId)) {
      onChange(value.filter((id) => id !== machineId));
    } else {
      onChange([...value, machineId]);
    }
  }

  const triggerId = `${fieldId}-trigger`;

  const menu =
    mounted && open && pos
      ? createPortal(
          <div
            ref={listRef}
            className="select-menu__list mp-machine-multi__list"
            role="listbox"
            aria-multiselectable="true"
            id={`${fieldId}-listbox`}
            aria-labelledby={triggerId}
            style={{
              position: "fixed",
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
              zIndex: 200,
            }}
          >
            <div className="mp-machine-multi__search">
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            {filteredMachines.length === 0 ? (
              <p className="mp-machine-multi__empty mp-muted">
                {machines.length === 0
                  ? "No machines yet — add them on the Machines tab first."
                  : "No machines match your search."}
              </p>
            ) : (
              filteredMachines.map((machine) => {
                const selected = value.includes(machine.id);
                return (
                  <label
                    key={machine.id}
                    className={`mp-machine-multi__option${selected ? " is-selected" : ""}`}
                    role="option"
                    aria-selected={selected}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleMachine(machine.id)}
                    />
                    <span>
                      {machine.name}
                      <span className="mp-muted"> · {machine.code}</span>
                      {!machine.isActive ? (
                        <span className="mp-muted"> (inactive)</span>
                      ) : null}
                    </span>
                  </label>
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={`select-menu${open ? " is-open" : ""}`}
    >
      <input
        id={fieldId}
        tabIndex={-1}
        aria-hidden
        value={displayValue}
        onChange={() => undefined}
        className="select-menu__native"
      />
      <button
        id={triggerId}
        type="button"
        className="select-menu__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${fieldId}-listbox` : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        onKeyDown={onTriggerKey}
      >
        <span
          className={`select-menu__value${!displayValue ? " is-placeholder" : ""}`}
        >
          {displayValue || placeholder}
        </span>
        <span className="select-menu__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {menu}
    </div>
  );
}
