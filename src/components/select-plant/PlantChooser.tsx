"use client";

import { useTransition } from "react";
import { selectPlantAction } from "@/app/select-plant/actions";

type PlantChoice = {
  id: string;
  name: string;
  code: string;
};

type PlantChooserProps = {
  plants: PlantChoice[];
  /** When set, this plant is shown as the active one and cannot be re-selected. */
  currentPlantId?: string | null;
};

export function PlantChooser({
  plants,
  currentPlantId = null,
}: PlantChooserProps) {
  const [pending, startTransition] = useTransition();

  function choose(plantId: string) {
    startTransition(async () => {
      await selectPlantAction(plantId);
    });
  }

  return (
    <div className="select-plant-grid">
      {plants.map((plant) => {
        const isCurrent = plant.id === currentPlantId;
        const classNames = [
          "select-plant-option",
          isCurrent ? "select-plant-option--current" : "",
          pending && !isCurrent ? "select-plant-option--pending" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={plant.id}
            type="button"
            className={classNames}
            disabled={pending || isCurrent}
            aria-current={isCurrent ? "true" : undefined}
            onClick={() => choose(plant.id)}
          >
            <span className="select-plant-option__meta">
              <span className="select-plant-option__name">{plant.name}</span>
              <span className="select-plant-option__code">{plant.code}</span>
            </span>
            {isCurrent ? (
              <span className="select-plant-option__badge">Current</span>
            ) : (
              <span className="select-plant-option__arrow" aria-hidden="true">
                →
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
