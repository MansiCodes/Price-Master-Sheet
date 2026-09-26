"use client";

import { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { PasswordEyeIcon } from "../login/PasswordEyeIcon";

type ForgotPasswordPasswordStepProps = {
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean | ((prev: boolean) => boolean)) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (value: boolean | ((prev: boolean) => boolean)) => void;
  error: string | null;
  loading: boolean;
  onResetPassword: (e: FormEvent) => void;
  onBackToOtp: () => void;
};

export function ForgotPasswordPasswordStep({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  error,
  loading,
  onResetPassword,
  onBackToOtp,
}: ForgotPasswordPasswordStepProps) {
  const t = useTranslations("auth");

  return (
    <>
      <p className="lead">{t("resetPasswordLead")}</p>

      {error ? (
        <div className="alert alert--error" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}

      <form className="form-grid" onSubmit={onResetPassword}>
        <div className="field">
          <label htmlFor="password">{t("newPassword")}</label>
          <div className="login-password">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              required
              placeholder={t("newPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="login-password__toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? t("hidePassword") : t("showPassword")
              }
              disabled={loading}
            >
              <PasswordEyeIcon visible={showPassword} />
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="confirmPassword">{t("confirmNewPassword")}</label>
          <div className="login-password">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              placeholder={t("confirmNewPassword")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="login-password__toggle"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={
                showConfirmPassword ? t("hidePassword") : t("showPassword")
              }
              disabled={loading}
            >
              <PasswordEyeIcon visible={showConfirmPassword} />
            </button>
          </div>
        </div>
        
        <button
          className="btn btn-primary login-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? t("resettingPassword") : t("resetPassword")}
        </button>

        <button
          type="button"
          className="login-link-btn"
          onClick={onBackToOtp}
          disabled={loading}
          style={{ marginTop: "0.5rem" }}
        >
          {t("backToLogin")} {/* Go back to OTP verification */}
        </button>
      </form>
    </>
  );
}
