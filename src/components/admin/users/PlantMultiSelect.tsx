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
import type { PlantOption } from "./types";

type PlantMultiSelectProps = {
  id?: string;
  plants: PlantOption[];
  value: string[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  onChange: (plantIds: string[]) => void;
};

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

export function PlantMultiSelect({
  id,
  plants,
  value,
  disabled = false,
  required,
  placeholder = "Select plant(s)",
  onChange,
}: PlantMultiSelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);

  const activePlants = useMemo(
    () => plants.filter((p) => p.isActive),
    [plants],
  );

  const allSelected =
    activePlants.length > 0 &&
    activePlants.every((p) => value.includes(p.id));

  const displayValue = useMemo(() => {
    if (value.length === 0) return "";
    if (allSelected) return "All plants";
    const names = activePlants
      .filter((p) => value.includes(p.id))
      .map((p) => p.name);
    return names.join(", ");
  }, [value, activePlants, allSelected]);

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

  function togglePlant(plantId: string) {
    if (value.includes(plantId)) {
      onChange(value.filter((id) => id !== plantId));
    } else {
      onChange([...value, plantId]);
    }
  }

  function toggleAll() {
    onChange(allSelected ? [] : activePlants.map((p) => p.id));
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
            <label className="users-plant-multi__option users-plant-multi__option--all">
              <input
                type="checkbox"
                checked={allSelected}
                disabled={disabled || activePlants.length === 0}
                onChange={toggleAll}
              />
              <span>All plants</span>
            </label>
            {activePlants.map((plant) => {
              const selected = value.includes(plant.id);
              return (
                <label
                  key={plant.id}
                  className={`users-plant-multi__option${selected ? " is-selected" : ""}`}
                  role="option"
                  aria-selected={selected}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled}
                    onChange={() => togglePlant(plant.id)}
                  />
                  <span>{plant.name}</span>
                </label>
              );
            })}
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
        required={required || undefined}
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
