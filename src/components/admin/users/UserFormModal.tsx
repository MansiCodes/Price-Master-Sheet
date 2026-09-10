"use client";

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { ROLE_LABEL, ROLES, fromStoredIndiaPhone, indianMobileDigits, type PlantOption, type RoleValue, type UserRow } from "./types";
import { ExtraAccessSelect, type ExtraAccessKey, type ExtraAccessOption } from "./ExtraAccessSelect";
import { PlantMultiSelect } from "./PlantMultiSelect";

type UserFormModalProps = {
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
    isActive: boolean;
    plantIds: string[];
  }) => Promise<void>;
};

export function UserFormModal({
  open,
  editing,
  saving,
  error,
  allowSuperAdmin,
  plants,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
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
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlantIds, setSelectedPlantIds] = useState<string[]>([]);
  const [plantError, setPlantError] = useState<string | null>(null);

  const activePlants = useMemo(
    () => plants.filter((p) => p.isActive),
    [plants],
  );
  const requiresPlants =
    globalRole !== "SUPER_ADMIN" &&
    globalRole !== "VIEWER" &&
    globalRole !== "MACHINE_SUPERVISOR";
  const canAddMachineSupervise =
    globalRole === "PLANT_MANAGER" || globalRole === "ACCOUNTANT";
  const priceSheetLocked =
    globalRole === "SUPER_ADMIN" || globalRole === "VIEWER";
  const mpAdminLocked = globalRole === "SUPER_ADMIN";

  const extraAccessOptions = useMemo<ExtraAccessOption[]>(() => {
    const opts: ExtraAccessOption[] = [
      {
        id: "PRICE_SHEET",
        label: "Can view Price Sheet",
        locked: priceSheetLocked,
      },
    ];
    if (canAddMachineSupervise) {
      opts.push({
        id: "MACHINE_SUPERVISOR",
        label: "Also Machine Supervisor",
      });
    }
    opts.push({
      id: "MP_ADMIN",
      label: "MP Admin",
      locked: mpAdminLocked,
    });
    return opts;
  }, [canAddMachineSupervise, priceSheetLocked, mpAdminLocked]);

  const extraAccessValue = useMemo<ExtraAccessKey[]>(() => {
    const selected: ExtraAccessKey[] = [];
    if (canViewPriceSheet || priceSheetLocked) selected.push("PRICE_SHEET");
    if (canAddMachineSupervise && canMachineSupervise) {
      selected.push("MACHINE_SUPERVISOR");
    }
    if (canAdminMachineProduction || mpAdminLocked) selected.push("MP_ADMIN");
    return selected;
  }, [
    canViewPriceSheet,
    canMachineSupervise,
    canAdminMachineProduction,
    canAddMachineSupervise,
    priceSheetLocked,
    mpAdminLocked,
  ]);

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
    if (!open) return;
    if (
      globalRole === "SUPER_ADMIN" ||
      globalRole === "VIEWER" ||
      globalRole === "MACHINE_SUPERVISOR"
    ) {
      setSelectedPlantIds([]);
      setPlantError(null);
      setCanMachineSupervise(false);
      if (globalRole === "SUPER_ADMIN") {
        setCanViewPriceSheet(true);
        setCanAdminMachineProduction(true);
      } else if (globalRole === "VIEWER") {
        setCanViewPriceSheet(true);
      }
      return;
    }
    if (
      globalRole !== "PLANT_MANAGER" &&
      globalRole !== "ACCOUNTANT" &&
      canMachineSupervise
    ) {
      setCanMachineSupervise(false);
    }
    if (selectedPlantIds.length === 0 && activePlants[0] && !editing) {
      setSelectedPlantIds([activePlants[0].id]);
    }
  }, [globalRole, open, activePlants, editing, selectedPlantIds.length, canMachineSupervise]);

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

  const roleChoices = useMemo(() => {
    return ROLES.filter((r) => {
      if (r !== "SUPER_ADMIN") return true;
      return allowSuperAdmin || globalRole === "SUPER_ADMIN";
    });
  }, [allowSuperAdmin, globalRole]);

  if (!mounted) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = indianMobileDigits(phone);
    if (digits.length !== 10) {
      return;
    }
    if (requiresPlants && selectedPlantIds.length === 0) {
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
      canViewPriceSheet: priceSheetLocked || canViewPriceSheet,
      canMachineSupervise:
        globalRole === "PLANT_MANAGER" || globalRole === "ACCOUNTANT"
          ? canMachineSupervise
          : false,
      canAdminMachineProduction: mpAdminLocked || canAdminMachineProduction,
      isActive: editing?.isActive ?? true,
      plantIds:
        globalRole === "SUPER_ADMIN" ||
        globalRole === "VIEWER" ||
        globalRole === "MACHINE_SUPERVISOR"
          ? []
          : selectedPlantIds,
    });
  }

  function onPlantIdsChange(next: string[]) {
    setPlantError(null);
    setSelectedPlantIds(next);
  }

  function onExtraAccessChange(next: ExtraAccessKey[]) {
    setCanViewPriceSheet(priceSheetLocked || next.includes("PRICE_SHEET"));
    setCanMachineSupervise(
      canAddMachineSupervise && next.includes("MACHINE_SUPERVISOR"),
    );
    setCanAdminMachineProduction(mpAdminLocked || next.includes("MP_ADMIN"));
  }

  const extraAccessField = (
    <div className={`field${requiresPlants ? " users-modal__span-2" : ""}`}>
      <label htmlFor="user-extra-access">Extra access</label>
      <ExtraAccessSelect
        id="user-extra-access"
        options={extraAccessOptions}
        value={extraAccessValue}
        disabled={saving}
        placeholder="Select extra access"
        onChange={onExtraAccessChange}
      />
    </div>
  );

  return (
    <div
      className={`users-modal ${visible ? "is-open" : ""}`}
      role="presentation"
    >
      <div
        className="users-modal__backdrop"
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="users-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="users-modal__header">
          <h2 id={titleId} className="users-sr-only">
            {editingId ? t("editUser") : t("createUser")}
          </h2>
          <div className="users-modal__hero-icon" aria-hidden="true">
            {editingId ? (
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                <path d="M4 20a8 8 0 0 1 10.5-7.6" />
                <path d="M15.5 15.5 21 21" />
                <path d="m17.2 20.2 2.6-2.6a1.5 1.5 0 0 0 0-2.1l-.1-.1a1.5 1.5 0 0 0-2.1 0L15 18.5v2.1Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                <path d="M4 20a8 8 0 0 1 12.5-6.6" />
                <path d="M19 8v6M16 11h6" />
              </svg>
            )}
          </div>
          <button
            type="button"
            className="users-modal__close"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            ✕
          </button>
        </div>

        <form
          id="user-form"
          className="users-modal__body"
          onSubmit={handleSubmit}
        >
          {error ? <div className="alert alert--error">{error}</div> : null}

          <div className="users-modal__grid">
            <div className="field">
              <label htmlFor="user-email">Email address</label>
              <input
                ref={firstFieldRef}
                id="user-email"
                type="email"
                required
                disabled={saving}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                placeholder="name@company.com"
              />
            </div>
            <div className="field">
              <label htmlFor="user-name">Full name</label>
              <input
                id="user-name"
                value={name}
                disabled={saving}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="field">
              <label htmlFor="user-phone">Mobile no.</label>
              <div className="users-phone">
                <span className="users-phone__prefix" aria-hidden="true">
                  +91
                </span>
                <input
                  id="user-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required
                  disabled={saving}
                  value={phone}
                  maxLength={10}
                  pattern="[0-9]{10}"
                  title="Enter a 10-digit Indian mobile number"
                  placeholder="Mobile number"
                  onChange={(e) =>
                    setPhone(indianMobileDigits(e.target.value).slice(0, 10))
                  }
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="user-password">
                Password{editingId ? " (leave blank to keep)" : ""}
              </label>
              <div className="users-password">
                <input
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  required={!editingId}
                  minLength={8}
                  value={password}
                  disabled={saving}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder={editingId ? "••••••••" : "Min. 8 characters"}
                />
                <button
                  type="button"
                  className="users-password__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={saving}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div className="field">
              <label htmlFor="user-role">Global role</label>
              <SelectMenu
                id="user-role"
                value={ROLE_LABEL[globalRole]}
                options={roleChoices.map((r) => ROLE_LABEL[r])}
                required
                disabled={saving || globalRole === "SUPER_ADMIN"}
                onChange={(label) => {
                  const next = roleChoices.find((r) => ROLE_LABEL[r] === label);
                  if (next) setGlobalRole(next);
                }}
              />
            </div>
            {requiresPlants ? (
              <div className="field">
                <label htmlFor="user-plant">{t("plant")}</label>
                <PlantMultiSelect
                  id="user-plant"
                  plants={activePlants}
                  value={selectedPlantIds}
                  required
                  disabled={saving || activePlants.length === 0}
                  placeholder={t("selectPlants")}
                  onChange={onPlantIdsChange}
                />
                {plantError ? (
                  <p className="users-plants__error" role="alert">
                    {plantError}
                  </p>
                ) : null}
              </div>
            ) : (
              extraAccessField
            )}
            {requiresPlants ? extraAccessField : null}
          </div>
        </form>

        <div className="users-modal__footer">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            form="user-form"
            disabled={saving}
            style={{ flex: "none" }}
          >
            {saving
              ? tCommon("saving")
              : editingId
                ? t("saveChanges")
                : t("createUser")}
          </Button>
        </div>
      </div>
    </div>
  );
}
