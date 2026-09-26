"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ExtraAccessKey } from "./ExtraAccessSelect";
import {
  ROLES,
  indianMobileDigits,
  type RoleValue,
} from "./types";
import {
  buildExtraAccessOptions,
  buildExtraAccessValue,
  computeUserFormFlags,
  plantHasQuadSignal,
  type UserFormModalProps,
} from "./user-form-modal-model";
import { useUserFormModalEffects } from "./useUserFormModalEffects";

export function useUserFormModal({
  open,
  editing,
  saving,
  allowSuperAdmin,
  plants,
  onClose,
  onSubmit,
}: Omit<UserFormModalProps, "error">) {
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("admin");
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const editingId = editing?.id ?? null;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [globalRole, setGlobalRole] = useState<RoleValue>("ACCOUNTANT");
  const [canViewPriceSheet, setCanViewPriceSheet] = useState(false);
  const [canMachineSupervise, setCanMachineSupervise] = useState(false);
  const [canAdminMachineProduction, setCanAdminMachineProduction] =
    useState(false);
  const [canAccessStock, setCanAccessStock] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlantIds, setSelectedPlantIds] = useState<string[]>([]);
  const [plantError, setPlantError] = useState<string | null>(null);

  const activePlants = useMemo(
    () => plants.filter((p) => p.isActive),
    [plants],
  );
  const flags = useMemo(
    () =>
      computeUserFormFlags(
        globalRole,
        canAccessStock,
        selectedPlantIds,
        activePlants,
      ),
    [globalRole, canAccessStock, selectedPlantIds, activePlants],
  );
  const extraAccessOptions = useMemo(
    () =>
      buildExtraAccessOptions({
        canAddMachineSupervise: flags.canAddMachineSupervise,
        priceSheetLocked: flags.priceSheetLocked,
        mpAdminLocked: flags.mpAdminLocked,
        selectedHasQuadSignal: flags.selectedHasQuadSignal,
      }),
    [
      flags.canAddMachineSupervise,
      flags.priceSheetLocked,
      flags.mpAdminLocked,
      flags.selectedHasQuadSignal,
    ],
  );
  const extraAccessValue = useMemo(
    () =>
      buildExtraAccessValue({
        canViewPriceSheet,
        canMachineSupervise,
        canAdminMachineProduction,
        canAccessStock,
        canAddMachineSupervise: flags.canAddMachineSupervise,
        priceSheetLocked: flags.priceSheetLocked,
        mpAdminLocked: flags.mpAdminLocked,
        selectedHasQuadSignal: flags.selectedHasQuadSignal,
      }),
    [
      canViewPriceSheet,
      canMachineSupervise,
      canAdminMachineProduction,
      canAccessStock,
      flags.canAddMachineSupervise,
      flags.priceSheetLocked,
      flags.mpAdminLocked,
      flags.selectedHasQuadSignal,
    ],
  );

  useUserFormModalEffects({
    open,
    editing,
    saving,
    onClose,
    firstFieldRef,
    mounted,
    setMounted,
    visible,
    setVisible,
    editingId,
    activePlants,
    selectedHasQuadSignal: flags.selectedHasQuadSignal,
    canAccessStock,
    setCanAccessStock,
    globalRole,
    canMachineSupervise,
    selectedPlantIdsLength: selectedPlantIds.length,
    setEmail,
    setName,
    setPhone,
    setPassword,
    setGlobalRole,
    setCanViewPriceSheet,
    setCanMachineSupervise,
    setCanAdminMachineProduction,
    setSelectedPlantIds,
    setShowPassword,
    setPlantError,
  });

  const roleChoices = useMemo(() => {
    return ROLES.filter((r) => {
      if (r !== "SUPER_ADMIN") return true;
      return allowSuperAdmin || globalRole === "SUPER_ADMIN";
    });
  }, [allowSuperAdmin, globalRole]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = indianMobileDigits(phone);
    if (digits.length !== 10) {
      return;
    }
    if (flags.requiresPlants && selectedPlantIds.length === 0) {
      setPlantError(t("assignPlantRequired"));
      return;
    }
    setPlantError(null);
    await onSubmit({
      email,
      name,
      phone: digits,
      password,
      globalRole,
      canViewPriceSheet: flags.priceSheetLocked || canViewPriceSheet,
      canMachineSupervise:
        globalRole === "PLANT_MANAGER" || globalRole === "ACCOUNTANT"
          ? canMachineSupervise
          : false,
      canAdminMachineProduction: flags.mpAdminLocked || canAdminMachineProduction,
      canAccessStock: flags.selectedHasQuadSignal ? canAccessStock : false,
      isActive: editing?.isActive ?? true,
      plantIds:
        globalRole === "SUPER_ADMIN" ||
        globalRole === "VIEWER" ||
        (globalRole === "MACHINE_SUPERVISOR" && !canAccessStock)
          ? []
          : selectedPlantIds,
    });
  }

  function onPlantIdsChange(next: string[]) {
    setPlantError(null);
    setSelectedPlantIds(next);
  }

  function onExtraAccessChange(next: ExtraAccessKey[]) {
    setCanViewPriceSheet(flags.priceSheetLocked || next.includes("PRICE_SHEET"));
    setCanMachineSupervise(
      flags.canAddMachineSupervise && next.includes("MACHINE_SUPERVISOR"),
    );
    setCanAdminMachineProduction(flags.mpAdminLocked || next.includes("MP_ADMIN"));
    const stockOn = flags.selectedHasQuadSignal && next.includes("STOCK");
    setCanAccessStock(stockOn);
    if (
      stockOn &&
      globalRole === "MACHINE_SUPERVISOR" &&
      selectedPlantIds.length === 0 &&
      activePlants[0]
    ) {
      const quad =
        activePlants.find((p) => plantHasQuadSignal(p.code)) ?? activePlants[0];
      setSelectedPlantIds([quad.id]);
    }
  }

  return {
    firstFieldRef,
    panelRef,
    mounted,
    visible,
    editingId,
    email,
    setEmail,
    name,
    setName,
    phone,
    setPhone,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    globalRole,
    setGlobalRole,
    roleChoices,
    flags,
    activePlants,
    selectedPlantIds,
    plantError,
    extraAccessOptions,
    extraAccessValue,
    handleSubmit,
    onPlantIdsChange,
    onExtraAccessChange,
  };
}
