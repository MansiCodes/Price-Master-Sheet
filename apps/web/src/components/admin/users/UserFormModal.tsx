"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ROLE_LABEL, ROLES, type RoleValue, type UserRow } from "./types";

type UserFormModalProps = {
  open: boolean;
  editing: UserRow | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    email: string;
    name: string;
    password: string;
    globalRole: RoleValue;
    canViewPriceSheet: boolean;
    isActive: boolean;
  }) => Promise<void>;
};

export function UserFormModal({
  open,
  editing,
  saving,
  error,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const editingId = editing?.id ?? null;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [globalRole, setGlobalRole] = useState<RoleValue>("ACCOUNTANT");
  const [canViewPriceSheet, setCanViewPriceSheet] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

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
      setPassword("");
      setGlobalRole(editing.globalRole as RoleValue);
      setCanViewPriceSheet(editing.canViewPriceSheet);
      setIsActive(editing.isActive);
    } else {
      setEmail("");
      setName("");
      setPassword("");
      setGlobalRole("ACCOUNTANT");
      setCanViewPriceSheet(false);
      setIsActive(true);
    }
    setShowPassword(false);
  }, [open, editing]);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [visible, editingId]);

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

  if (!mounted) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit({
      email,
      name,
      password,
      globalRole,
      canViewPriceSheet,
      isActive,
    });
  }

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
            {editingId ? "Edit user" : "Create user"}
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
                required={!editingId}
                disabled={Boolean(editingId) || saving}
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
              <select
                id="user-role"
                value={globalRole}
                disabled={saving}
                onChange={(e) => setGlobalRole(e.target.value as RoleValue)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="users-modal__checks">
            <label className="users-check">
              <input
                type="checkbox"
                checked={canViewPriceSheet || globalRole === "SUPER_ADMIN"}
                disabled={globalRole === "SUPER_ADMIN" || saving}
                onChange={(e) => setCanViewPriceSheet(e.target.checked)}
              />
              <span>Can view Price Sheet</span>
            </label>
            {editingId ? (
              <label className="users-check">
                <input
                  type="checkbox"
                  checked={isActive}
                  disabled={saving}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>Active</span>
              </label>
            ) : null}
          </div>
        </form>

        <div className="users-modal__footer">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="user-form"
            disabled={saving}
            style={{ flex: "none" }}
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Create user"}
          </Button>
        </div>
      </div>
    </div>
  );
}
