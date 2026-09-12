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

export type ExtraAccessKey =
  | "PRICE_SHEET"
  | "MACHINE_SUPERVISOR"
  | "MP_ADMIN"
  | "STOCK";

export type ExtraAccessOption = {
  id: ExtraAccessKey;
  label: string;
  locked?: boolean;
};

type ExtraAccessSelectProps = {
  id?: string;
  options: ExtraAccessOption[];
  value: ExtraAccessKey[];
  disabled?: boolean;
  placeholder?: string;
  onChange: (next: ExtraAccessKey[]) => void;
};

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

export function ExtraAccessSelect({
  id,
  options,
  value,
  disabled = false,
  placeholder = "Select extra access",
  onChange,
}: ExtraAccessSelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);

  const displayValue = useMemo(() => {
    const labels = options
      .filter((opt) => value.includes(opt.id))
      .map((opt) => opt.label);
    return labels.join(", ");
  }, [options, value]);

  useEffect(() => {
    setMounted(true);
  }, []);

  function updatePosition() {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      140,
      Math.min(280, openUp ? spaceAbove : spaceBelow),
    );
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

  function toggle(idValue: ExtraAccessKey, locked?: boolean) {
    if (locked || disabled) return;
    if (value.includes(idValue)) {
      onChange(value.filter((v) => v !== idValue));
    } else {
      onChange([...value, idValue]);
    }
  }

  const triggerId = `${fieldId}-trigger`;

  const menu =
    mounted && open && pos
      ? createPortal(
          <div
            ref={listRef}
            className="select-menu__list users-plant-multi__list"
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
            {options.map((opt) => {
              const selected = value.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`users-plant-multi__option${selected ? " is-selected" : ""}`}
                  role="option"
                  aria-selected={selected}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled || opt.locked}
                    onChange={() => toggle(opt.id, opt.locked)}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`select-menu${open ? " is-open" : ""}`}>
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
