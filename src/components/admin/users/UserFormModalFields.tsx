"use client";

import { RefObject } from "react";
import { useTranslations } from "next-intl";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { ExtraAccessSelect, type ExtraAccessKey, type ExtraAccessOption } from "./ExtraAccessSelect";
import { PlantMultiSelect } from "./PlantMultiSelect";
import { ROLE_LABEL, indianMobileDigits, type PlantOption, type RoleValue } from "./types";

type UserFormModalFieldsProps = {
  firstFieldRef: RefObject<HTMLInputElement | null>;
  saving: boolean;
  email: string;
  setEmail: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean | ((prev: boolean) => boolean)) => void;
  editingId: string | null;
  globalRole: RoleValue;
  setGlobalRole: (value: RoleValue) => void;
  roleChoices: RoleValue[];
  showPlantPicker: boolean;
  requiresPlants: boolean;
  activePlants: PlantOption[];
  selectedPlantIds: string[];
  plantError: string | null;
  extraAccessOptions: ExtraAccessOption[];
  extraAccessValue: ExtraAccessKey[];
  extraAccessFieldClassName: string;
  onPlantIdsChange: (next: string[]) => void;
  onExtraAccessChange: (next: ExtraAccessKey[]) => void;
};

export function UserFormModalFields({
  firstFieldRef,
  saving,
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
  editingId,
  globalRole,
  setGlobalRole,
  roleChoices,
  showPlantPicker,
  requiresPlants,
  activePlants,
  selectedPlantIds,
  plantError,
  extraAccessOptions,
  extraAccessValue,
  extraAccessFieldClassName,
  onPlantIdsChange,
  onExtraAccessChange,
}: UserFormModalFieldsProps) {
  const t = useTranslations("admin");

  const extraAccessField = (
    <div className={extraAccessFieldClassName}>
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
      {showPlantPicker ? (
        <div className="field">
          <label htmlFor="user-plant">{t("plant")}</label>
          <PlantMultiSelect
            id="user-plant"
            plants={activePlants}
            value={selectedPlantIds}
            required={requiresPlants}
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
      {showPlantPicker ? extraAccessField : null}
    </div>
  );
}
