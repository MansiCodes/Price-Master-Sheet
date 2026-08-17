"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import "./change-password.css";

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const t = useTranslations("common");
  const titleId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswords(false);
    setError(null);
    setOk(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, saving]);

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setOk(null);
    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Password update failed");
      }
      setOk(t("passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pwd-modal" role="presentation">
      <div
        className="pwd-modal__backdrop"
        aria-hidden="true"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        className="pwd-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="pwd-modal__header">
          <h2 id={titleId}>{t("changePassword")}</h2>
          <button
            type="button"
            className="pwd-modal__close"
            onClick={onClose}
            aria-label={t("cancel")}
            disabled={saving}
          >
            ✕
          </button>
        </div>

        <form className="pwd-modal__body" onSubmit={onSubmit}>
          {error ? <div className="alert alert--error">{error}</div> : null}
          {ok ? <div className="alert alert--ok">{ok}</div> : null}

          <div className="field">
            <label htmlFor="pwd-current">{t("currentPassword")}</label>
            <input
              id="pwd-current"
              type={showPasswords ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={saving}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="pwd-new">{t("newPassword")}</label>
            <input
              id="pwd-new"
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={saving}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
          </div>

          <div className="field">
            <label htmlFor="pwd-confirm">{t("confirmPassword")}</label>
            <input
              id="pwd-confirm"
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={saving}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <label className="pwd-modal__show">
            <input
              type="checkbox"
              checked={showPasswords}
              disabled={saving}
              onChange={(e) => setShowPasswords(e.target.checked)}
            />
            <span>{t("showPasswords")}</span>
          </label>

          <div className="pwd-modal__footer">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={saving} style={{ flex: "none" }}>
              {saving ? t("saving") : t("changePassword")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
