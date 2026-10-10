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
import {
  measureSelectMenuPos,
  type SelectMenuPos,
} from "./select-menu-position";

export type SelectMenuItem = {
  value: string;
  label: string;
  /** Extra text matched when `searchable` (e.g. machine code). */
  searchText?: string;
};

function optionStartsWith(opt: SelectMenuItem, q: string) {
  const parts = [opt.label, opt.searchText ?? "", opt.value]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter(Boolean);
  return parts.some((part) => part.startsWith(q));
}

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
  /** Type a value that is not in the list (saved as the field value). */
  allowCustom?: boolean;
  searchPlaceholder?: string;
  onChange: (value: string) => void;
  className?: string;
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
  allowCustom = false,
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
  const [pos, setPos] = useState<SelectMenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const resolvedItems = useMemo<SelectMenuItem[]>(() => {
    if (items) return [...items];
    return (options ?? []).map((opt) => ({ value: opt, label: opt }));
  }, [items, options]);

  const canSearch =
    !allowCustom && (searchable || resolvedItems.length >= 6);
  const showSuggestions = allowCustom && resolvedItems.length > 0;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 150);
    return () => window.clearTimeout(t);
  }, [search]);

  const filteredItems = useMemo(() => {
    const q = allowCustom
      ? value.trim().toLowerCase()
      : debouncedSearch.trim().toLowerCase();
    if (allowCustom) {
      if (!q) return resolvedItems;
      return resolvedItems.filter((opt) => optionStartsWith(opt, q));
    }
    if (!canSearch) return resolvedItems;
    if (!q) return resolvedItems;
    return resolvedItems.filter((opt) => optionStartsWith(opt, q));
  }, [resolvedItems, canSearch, debouncedSearch, allowCustom, value]);

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
    if (!canSearch) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, canSearch]);

  function updatePosition() {
    const el = rootRef.current;
    if (!el) return;
    setPos(measureSelectMenuPos(el, canSearch || showSuggestions));
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
  }, [open, canSearch]);

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
      return;
    }
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    if (canSearch) {
      setSearch((prev) => (open ? prev + e.key : e.key));
      setOpen(true);
      return;
    }
    const hit = resolvedItems.find((opt) => optionStartsWith(opt, e.key.toLowerCase()));
    if (hit) onChange(hit.value);
  }

  const triggerId = `${fieldId}-trigger`;

  const menu =
    mounted && open && pos && (!allowCustom || filteredItems.length > 0)
      ? createPortal(
          <div
            ref={listRef}
            className={`select-menu__list${canSearch ? " select-menu__list--searchable" : ""}`}
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
            {canSearch ? (
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
      {allowCustom ? (
        <div className="select-menu__trigger select-menu__trigger--combo">
          <input
            id={fieldId}
            className="select-menu__combo-input"
            required={required}
            disabled={disabled}
            autoComplete="off"
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (showSuggestions) setOpen(true);
            }}
            onFocus={() => {
              if (showSuggestions) setOpen(true);
            }}
          />
          {showSuggestions ? (
            <button
              type="button"
              className="select-menu__chevron-btn"
              tabIndex={-1}
              aria-label="Previous names"
              onClick={() => {
                if (!disabled) setOpen((v) => !v);
              }}
            >
              ▾
            </button>
          ) : null}
        </div>
      ) : (
        <>
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
        </>
      )}
      {menu}
    </div>
  );
}
