"use client";

import { RefObject, useEffect } from "react";
import {
  fromStoredIndiaPhone,
  type PlantOption,
  type RoleValue,
  type UserRow,
} from "./types";

type UserFormModalEffectsArgs = {
  open: boolean;
  editing: UserRow | null;
  saving: boolean;
  onClose: () => void;
  firstFieldRef: RefObject<HTMLInputElement | null>;
  mounted: boolean;
  setMounted: (value: boolean) => void;
  visible: boolean;
  setVisible: (value: boolean) => void;
  editingId: string | null;
  activePlants: PlantOption[];
  selectedHasQuadSignal: boolean;
  canAccessStock: boolean;
  setCanAccessStock: (value: boolean) => void;
  globalRole: RoleValue;
  canMachineSupervise: boolean;
  selectedPlantIdsLength: number;
  setEmail: (value: string) => void;
  setName: (value: string) => void;
  setPhone: (value: string) => void;
  setPassword: (value: string) => void;
  setGlobalRole: (value: RoleValue) => void;
  setCanViewPriceSheet: (value: boolean) => void;
  setCanMachineSupervise: (value: boolean) => void;
  setCanAdminMachineProduction: (value: boolean) => void;
  setSelectedPlantIds: (value: string[]) => void;
  setShowPassword: (value: boolean) => void;
  setPlantError: (value: string | null) => void;
};

export function useUserFormModalEffects({
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
  selectedHasQuadSignal,
  canAccessStock,
  setCanAccessStock,
  globalRole,
  canMachineSupervise,
  selectedPlantIdsLength,
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
}: UserFormModalEffectsArgs) {
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setEmail(editing.email);
      setName(editing.name ?? "");
      setPhone(fromStoredIndiaPhone(editing.phone));
      setPassword("");
      setGlobalRole(editing.globalRole as RoleValue);
      setCanViewPriceSheet(editing.canViewPriceSheet);
      setCanMachineSupervise(Boolean(editing.canMachineSupervise));
      setCanAdminMachineProduction(Boolean(editing.canAdminMachineProduction));
      setCanAccessStock(Boolean(editing.canAccessStock));
      setSelectedPlantIds(
        editing.plantRoles?.map((role) => role.plantId) ?? [],
      );
    } else {
      setEmail("");
      setName("");
      setPhone("");
      setPassword("");
      setGlobalRole("ACCOUNTANT");
      setCanViewPriceSheet(false);
      setCanMachineSupervise(false);
      setCanAdminMachineProduction(false);
      setCanAccessStock(false);
      setSelectedPlantIds(
        activePlants[0] ? [activePlants[0].id] : [],
      );
    }
    setShowPassword(false);
    setPlantError(null);
  }, [open, editing, activePlants]);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [visible, editingId]);

  useEffect(() => {
    if (!selectedHasQuadSignal && canAccessStock) {
      setCanAccessStock(false);
    }
  }, [selectedHasQuadSignal, canAccessStock]);

  useEffect(() => {
    if (!open) return;
    if (
      globalRole === "SUPER_ADMIN" ||
      globalRole === "VIEWER"
    ) {
      setSelectedPlantIds([]);
      setPlantError(null);
      setCanMachineSupervise(false);
      setCanAccessStock(false);
      if (globalRole === "SUPER_ADMIN") {
        setCanViewPriceSheet(true);
        setCanAdminMachineProduction(true);
      } else if (globalRole === "VIEWER") {
        setCanViewPriceSheet(true);
      }
      return;
    }
    if (globalRole === "MACHINE_SUPERVISOR") {
      setCanMachineSupervise(false);
      // Keep plants when Stock is enabled; otherwise optional plant pick for Stock extra.
      return;
    }
    if (
      globalRole !== "PLANT_MANAGER" &&
      globalRole !== "ACCOUNTANT" &&
      canMachineSupervise
    ) {
      setCanMachineSupervise(false);
    }
    if (selectedPlantIdsLength === 0 && activePlants[0] && !editing) {
      setSelectedPlantIds([activePlants[0].id]);
    }
  }, [globalRole, open, activePlants, editing, selectedPlantIdsLength, canMachineSupervise, canAccessStock]);

  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mounted, onClose, saving]);
}
