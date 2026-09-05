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
  /** Extra text matched when `searchable` (e.g. machine code). */
  searchText?: string;
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
  /** Show a filter input at the top of the dropdown. */
  searchable?: boolean;
  searchPlaceholder?: string;
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
  searchable = false,
  searchPlaceholder = "Search…",
  onChange,
  className,
}: SelectMenuProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");

  const resolvedItems = useMemo<SelectMenuItem[]>(() => {
    if (items) return [...items];
    return (options ?? []).map((opt) => ({ value: opt, label: opt }));
  }, [items, options]);

  const filteredItems = useMemo(() => {
    if (!searchable) return resolvedItems;
    const q = search.trim().toLowerCase();
    if (!q) return resolvedItems;
    return resolvedItems.filter((opt) => {
      const hay = `${opt.label} ${opt.searchText ?? ""} ${opt.value}`.toLowerCase();
      return hay.includes(q);
    });
  }, [resolvedItems, searchable, search]);

  const selectedLabel =
    resolvedItems.find((opt) => opt.value === value)?.label ?? "";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    if (!searchable) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, searchable]);

  function updatePosition() {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    const edgePad = 12;
    const spaceBelow = window.innerHeight - rect.bottom - gap - edgePad;
    const spaceAbove = rect.top - gap - edgePad;
    const minSpace = searchable ? 220 : 180;
    const openUp = spaceBelow < minSpace && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      searchable ? 160 : 140,
      Math.min(searchable ? 320 : 280, openUp ? spaceAbove : spaceBelow),
    );
    const maxWidth = Math.max(120, window.innerWidth - edgePad * 2);
    const width = Math.min(Math.max(rect.width, 180), maxWidth);
    // Keep the menu inside the viewport with padding on the right (and left).
    let left = rect.left;
    if (left + width > window.innerWidth - edgePad) {
      left = window.innerWidth - edgePad - width;
    }
    left = Math.max(edgePad, left);
    setPos({
      top: openUp ? rect.top - gap : rect.bottom + gap,
      left,
      width,
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
  }, [open, searchable]);

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
          <div
            ref={listRef}
            className={`select-menu__list${searchable ? " select-menu__list--searchable" : ""}`}
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
            {searchable ? (
              <div className="select-menu__search">
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ) : null}
            {filteredItems.length === 0 ? (
              <p className="select-menu__empty">No matches</p>
            ) : (
              filteredItems.map((opt) => {
                const selected = opt.value === value;
                const label =
                  opt.label === "" && opt.value === "" ? placeholder : opt.label;
                return (
                  <div
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
                  </div>
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
