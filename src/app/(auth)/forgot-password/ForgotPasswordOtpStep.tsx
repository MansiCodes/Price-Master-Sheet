"use client";

import { FormEvent } from "react";
import { useTranslations } from "next-intl";

type ForgotPasswordOtpStepProps = {
  otp: string;
  setOtp: (value: string) => void;
  error: string | null;
  devOtp: string | null;
  loading: boolean;
  onVerifyOtp: (e: FormEvent) => void;
  onChangeNumber: () => void;
};

export function ForgotPasswordOtpStep({
  otp,
  setOtp,
  error,
  devOtp,
  loading,
  onVerifyOtp,
  onChangeNumber,
}: ForgotPasswordOtpStepProps) {
  const t = useTranslations("auth");

  return (
    <>
      <p className="lead">{t("enterOtp")}</p>

      {error ? (
        <div className="alert alert--error" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}

      {devOtp ? (
        <div className="login-dev-otp" role="status" aria-live="polite" style={{ marginBottom: "1rem" }}>
          <span className="login-dev-otp__label">{t("devOtpLabel")}</span>
          <strong className="login-dev-otp__code">{devOtp}</strong>
          <span className="login-dev-otp__note">{t("devOtpNote")}</span>
        </div>
      ) : null}

      <form className="form-grid" onSubmit={onVerifyOtp}>
        <div className="field">
          <label htmlFor="login-otp">{t("enterOtpLabel")}</label>
          <input
            id="login-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            maxLength={4}
            pattern="[0-9]{4}"
            placeholder={t("otpPlaceholder")}
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            disabled={loading}
          />
        </div>
        
        <button
          className="btn btn-primary login-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? t("verifyingOtp") : t("verifyOtp")}
        </button>

        <button
          type="button"
          className="login-link-btn"
          onClick={onChangeNumber}
          disabled={loading}
          style={{ marginTop: "0.5rem" }}
        >
          {t("changeNumber")}
        </button>
      </form>
    </>
  );
}
