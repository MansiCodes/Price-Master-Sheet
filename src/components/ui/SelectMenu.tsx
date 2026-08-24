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

export type SelectMenuItem = {
  value: string;
  label: string;
};

type SelectMenuProps = {
  id?: string;
  label?: string;
  value: string;
  /** Simple string options (value === label). Prefer `items` when they differ. */
  options?: readonly string[];
  /** Value/label pairs — use for id-backed filters (machine, supervisor, etc.). */
  items?: readonly SelectMenuItem[];
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
};

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

export function SelectMenu({
  id,
  value,
  options,
  items,
  required,
  disabled = false,
  placeholder = "Select…",
  onChange,
  className,
}: SelectMenuProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);

  const resolvedItems = useMemo<SelectMenuItem[]>(() => {
    if (items) return [...items];
    return (options ?? []).map((opt) => ({ value: opt, label: opt }));
  }, [items, options]);

  const selectedLabel =
    resolvedItems.find((opt) => opt.value === value)?.label ?? "";

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
    const maxHeight = Math.max(140, Math.min(280, openUp ? spaceAbove : spaceBelow));
    setPos({
      top: openUp ? rect.top - gap : rect.bottom + gap,
      left: rect.left,
      width: Math.max(rect.width, 180),
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
    // Capture phase so the menu closes even if a parent stops bubbling
    // (e.g. slide-over / modal panels).
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [open, value]);

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  const triggerId = `${fieldId}-trigger`;

  const menu =
    mounted && open && pos
      ? createPortal(
          <ul
            ref={listRef}
            className="select-menu__list"
            role="listbox"
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
            {resolvedItems.map((opt) => {
              const selected = opt.value === value;
              const label =
                opt.label === "" && opt.value === "" ? placeholder : opt.label;
              return (
                <li
                  key={opt.value === "" ? "__blank__" : opt.value}
                  role="option"
                  aria-selected={selected}
                >
                  <button
                    type="button"
                    className={`select-menu__option${selected ? " is-selected" : ""}`}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={`select-menu${open ? " is-open" : ""}${className ? ` ${className}` : ""}`}
    >
      {/*
        Put the public `id` on a non-button control so <label htmlFor> only
        focuses this field and does NOT open the options list.
      */}
      <input
        id={fieldId}
        tabIndex={-1}
        aria-hidden
        required={required || undefined}
        value={value}
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
          className={`select-menu__value${!selectedLabel ? " is-placeholder" : ""}`}
        >
          {selectedLabel || placeholder}
        </span>
        <span className="select-menu__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {menu}
    </div>
  );
}
