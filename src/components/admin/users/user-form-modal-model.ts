import type { ExtraAccessKey, ExtraAccessOption } from "./ExtraAccessSelect";
import type { PlantOption, RoleValue, UserRow } from "./types";

export type UserFormModalProps = {
  open: boolean;
  editing: UserRow | null;
  saving: boolean;
  error: string | null;
  allowSuperAdmin: boolean;
  plants: PlantOption[];
  onClose: () => void;
  onSubmit: (payload: {
    email: string;
    name: string;
    phone: string;
    password: string;
    globalRole: RoleValue;
    canViewPriceSheet: boolean;
    canMachineSupervise: boolean;
    canAdminMachineProduction: boolean;
    canAccessStock: boolean;
    isActive: boolean;
    plantIds: string[];
  }) => Promise<void>;
};

export function plantHasQuadSignal(code: string | undefined) {
  const upper = code?.toUpperCase();
  return upper === "QUAD" || upper === "SIGNALLING" || upper === "QUADSIGNAL";
}

export function computeUserFormFlags(
  globalRole: RoleValue,
  canAccessStock: boolean,
  selectedPlantIds: string[],
  activePlants: PlantOption[],
) {
  const selectedHasQuadSignal = selectedPlantIds.some((id) =>
    plantHasQuadSignal(activePlants.find((p) => p.id === id)?.code),
  );
  const showPlantPicker =
    globalRole !== "SUPER_ADMIN" && globalRole !== "VIEWER";
  const requiresPlants =
    showPlantPicker &&
    (globalRole !== "MACHINE_SUPERVISOR" || canAccessStock);
  const canAddMachineSupervise =
    globalRole === "PLANT_MANAGER" || globalRole === "ACCOUNTANT";
  const priceSheetLocked =
    globalRole === "SUPER_ADMIN" || globalRole === "VIEWER";
  const mpAdminLocked = globalRole === "SUPER_ADMIN";
  return {
    selectedHasQuadSignal,
    showPlantPicker,
    requiresPlants,
    canAddMachineSupervise,
    priceSheetLocked,
    mpAdminLocked,
  };
}

export function buildExtraAccessOptions(args: {
  canAddMachineSupervise: boolean;
  priceSheetLocked: boolean;
  mpAdminLocked: boolean;
  selectedHasQuadSignal: boolean;
}): ExtraAccessOption[] {
  const opts: ExtraAccessOption[] = [
    {
      id: "PRICE_SHEET",
      label: "Can view Price Sheet",
      locked: args.priceSheetLocked,
    },
  ];
  if (args.canAddMachineSupervise) {
    opts.push({
      id: "MACHINE_SUPERVISOR",
      label: "Also Machine Supervisor",
    });
  }
  opts.push({
    id: "MP_ADMIN",
    label: "MP Admin",
    locked: args.mpAdminLocked,
  });
  if (args.selectedHasQuadSignal) {
    opts.push({
      id: "STOCK",
      label: "Stock (page + Today's Entry)",
    });
  }
  return opts;
}

export function buildExtraAccessValue(args: {
  canViewPriceSheet: boolean;
  canMachineSupervise: boolean;
  canAdminMachineProduction: boolean;
  canAccessStock: boolean;
  canAddMachineSupervise: boolean;
  priceSheetLocked: boolean;
  mpAdminLocked: boolean;
  selectedHasQuadSignal: boolean;
}): ExtraAccessKey[] {
  const selected: ExtraAccessKey[] = [];
  if (args.canViewPriceSheet || args.priceSheetLocked) selected.push("PRICE_SHEET");
  if (args.canAddMachineSupervise && args.canMachineSupervise) {
    selected.push("MACHINE_SUPERVISOR");
  }
  if (args.canAdminMachineProduction || args.mpAdminLocked) selected.push("MP_ADMIN");
  if (args.canAccessStock && args.selectedHasQuadSignal) selected.push("STOCK");
  return selected;
}
