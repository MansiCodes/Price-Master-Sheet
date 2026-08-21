/** Daily forms required for a shift to count as complete (Production is optional). */
export const REQUIRED_SHIFT_FORM_KEYS = [
  "purchaseFilled",
  "saleFilled",
  "stockFilled",
  "pettyCashFilled",
] as const;

export type RequiredShiftFormKey = (typeof REQUIRED_SHIFT_FORM_KEYS)[number];

export const REQUIRED_SHIFT_FORM_COUNT = REQUIRED_SHIFT_FORM_KEYS.length;

export type ShiftFormFlags = Record<RequiredShiftFormKey, boolean> & {
  productionFilled?: boolean;
};

export function countRequiredShiftForms(flags: ShiftFormFlags): number {
  return REQUIRED_SHIFT_FORM_KEYS.filter((key) => Boolean(flags[key])).length;
}

export function allRequiredShiftFormsComplete(flags: ShiftFormFlags): boolean {
  return countRequiredShiftForms(flags) >= REQUIRED_SHIFT_FORM_COUNT;
}
