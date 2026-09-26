import type { SlotStatus } from "@/lib/machine-production/slots";

export function statusClass(status: SlotStatus) {
  if (status === "COMPLETED") return "mp-status--ok";
  if (status === "OVERDUE") return "mp-status--overdue";
  return "mp-status--pending";
}

/** Tints the whole card so a submitted slot is readable at a glance across the grid. */
export function cardStatusClass(status: SlotStatus) {
  if (status === "COMPLETED") return "mp-machine-card--ok";
  if (status === "OVERDUE") return "mp-machine-card--overdue";
  return "mp-machine-card--pending";
}
