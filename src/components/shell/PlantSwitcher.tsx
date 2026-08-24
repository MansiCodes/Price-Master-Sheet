"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  selectPlantAction,
  viewAllPlantsAction,
} from "@/app/select-plant/actions";

export type PlantSwitcherPlant = {
  id: string;
  name: string;
  code: string;
  rmSummary?: string;
};

type PlantSwitcherProps = {
  plants: PlantSwitcherPlant[];
  currentPlantId: string | null;
  showLabels: boolean;
  allowAllPlants?: boolean;
  onNavigate?: () => void;
};

export function PlantSwitcher({
  plants,
  currentPlantId,
  showLabels,
  allowAllPlants = false,
  onNavigate,
}: PlantSwitcherProps) {
  const t = useTranslations("plantSwitcher");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const current = plants.find((p) => p.id === currentPlantId) ?? plants[0] ?? null;
  const allPlantsActive = allowAllPlants && !current;
  const isMulti = plants.length > 1 || allowAllPlants;

  if (!current && !allPlantsActive) return null;

  function choose(plantId: string) {
    if (plantId === currentPlantId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await selectPlantAction(plantId);
      onNavigate?.();
    });
  }

  function chooseAllPlants() {
    if (allPlantsActive) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await viewAllPlantsAction();
      onNavigate?.();
    });
  }

  return (
    <div className="dash-sidebar__plant" ref={rootRef}>
      {isMulti ? (
        <button
          type="button"
          className={`dash-sidebar__link dash-sidebar__plant-toggle${open ? " is-open" : ""}`}
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={pending}
          title={showLabels ? undefined : current?.name ?? t("label")}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="dash-sidebar__icon">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 21V10l8-6 8 6v11M9 21v-6h6v6M4 10h16" />
            </svg>
          </span>
          <span className="dash-sidebar__plant-meta">
            <span className="dash-sidebar__plant-label">{t("label")}</span>
            {current ? (
              <span className="dash-sidebar__plant-current">{current.name}</span>
            ) : allPlantsActive ? (
              <span className="dash-sidebar__plant-current">{t("allPlants")}</span>
            ) : null}
          </span>
          <span className="dash-sidebar__plant-chevron" aria-hidden="true">
            {open ? "▾" : "▸"}
          </span>
        </button>
      ) : (
        <div
          className="dash-sidebar__link dash-sidebar__plant-toggle"
          style={{ cursor: "default" }}
          title={showLabels ? undefined : current?.name ?? t("label")}
        >
          <span className="dash-sidebar__icon">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 21V10l8-6 8 6v11M9 21v-6h6v6M4 10h16" />
            </svg>
          </span>
          <span className="dash-sidebar__plant-meta">
            <span className="dash-sidebar__plant-label">{t("label")}</span>
            {current ? (
              <span className="dash-sidebar__plant-current">{current.name}</span>
            ) : null}
          </span>
        </div>
      )}

      {open && isMulti ? (
        <ul className="dash-sidebar__plant-list" role="listbox">
          {allowAllPlants ? (
            <li role="option" aria-selected={allPlantsActive}>
              <button
                type="button"
                className={`dash-sidebar__plant-option${allPlantsActive ? " is-current" : ""}`}
                disabled={allPlantsActive || pending}
                onClick={chooseAllPlants}
              >
                <span className="dash-sidebar__plant-option-name">
                  {t("allPlants")}
                </span>
                {allPlantsActive ? (
                  <span className="dash-sidebar__plant-option-tag">
                    {t("current")}
                  </span>
                ) : null}
              </button>
            </li>
          ) : null}
          {plants.map((plant) => {
            const isCurrent = plant.id === currentPlantId;
            return (
              <li key={plant.id} role="option" aria-selected={isCurrent}>
                <button
                  type="button"
                  className={`dash-sidebar__plant-option${isCurrent ? " is-current" : ""}`}
                  disabled={isCurrent || pending}
                  onClick={() => choose(plant.id)}
                >
                  <span className="dash-sidebar__plant-option-name">
                    {plant.name}
                  </span>
                  {isCurrent ? (
                    <span className="dash-sidebar__plant-option-tag">
                      {t("current")}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
