"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { UserFormModalFields } from "./UserFormModalFields";
import type { UserFormModalProps } from "./user-form-modal-model";
import { useUserFormModal } from "./useUserFormModal";

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
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const form = useUserFormModal({
    open,
    editing,
    saving,
    allowSuperAdmin,
    plants,
    onClose,
    onSubmit,
  });

  if (!form.mounted) return null;

  return (
    <div
      className={`users-modal ${form.visible ? "is-open" : ""}`}
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
        ref={form.panelRef}
        className="users-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="users-modal__header">
          <h2 id={titleId} className="users-sr-only">
            {form.editingId ? t("editUser") : t("createUser")}
          </h2>
          <div className="users-modal__hero-icon" aria-hidden="true">
            {form.editingId ? (
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
          onSubmit={form.handleSubmit}
        >
          {error ? <div className="alert alert--error">{error}</div> : null}

          <UserFormModalFields
            firstFieldRef={form.firstFieldRef}
            saving={saving}
            email={form.email}
            setEmail={form.setEmail}
            name={form.name}
            setName={form.setName}
            phone={form.phone}
            setPhone={form.setPhone}
            password={form.password}
            setPassword={form.setPassword}
            showPassword={form.showPassword}
            setShowPassword={form.setShowPassword}
            editingId={form.editingId}
            globalRole={form.globalRole}
            setGlobalRole={form.setGlobalRole}
            roleChoices={form.roleChoices}
            showPlantPicker={form.flags.showPlantPicker}
            requiresPlants={form.flags.requiresPlants}
            activePlants={form.activePlants}
            selectedPlantIds={form.selectedPlantIds}
            plantError={form.plantError}
            extraAccessOptions={form.extraAccessOptions}
            extraAccessValue={form.extraAccessValue}
            extraAccessFieldClassName={`field${form.flags.requiresPlants ? " users-modal__span-2" : ""}`}
            onPlantIdsChange={form.onPlantIdsChange}
            onExtraAccessChange={form.onExtraAccessChange}
          />
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
              : form.editingId
                ? t("saveChanges")
                : t("createUser")}
          </Button>
        </div>
      </div>
    </div>
  );
}
