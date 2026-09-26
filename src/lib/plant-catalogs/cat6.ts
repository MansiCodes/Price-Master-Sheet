import {
  CAT6_PETTY_APPROVED_BY,
  CAT6_PETTY_CHECKED_BY,
  CAT6_PETTY_LOCATIONS,
  CAT6_PETTY_NATURES,
  CAT6_PETTY_PERSONS,
  CAT6_PURCHASE_GOODS,
  CAT6_SUPPLIERS,
} from "@/lib/cat6-catalogs";

export const DEFAULT_PURCHASE_GOODS = CAT6_PURCHASE_GOODS;
export const DEFAULT_SUPPLIERS = CAT6_SUPPLIERS;

export function getCat6PettyCatalog(): {
  natures: readonly string[];
  persons: readonly string[];
  locations: readonly string[];
  checkedBy: readonly string[];
  approvedBy: readonly string[];
} {
  return {
    natures: CAT6_PETTY_NATURES,
    persons: CAT6_PETTY_PERSONS,
    locations: CAT6_PETTY_LOCATIONS,
    checkedBy: CAT6_PETTY_CHECKED_BY,
    approvedBy: CAT6_PETTY_APPROVED_BY,
  };
}
