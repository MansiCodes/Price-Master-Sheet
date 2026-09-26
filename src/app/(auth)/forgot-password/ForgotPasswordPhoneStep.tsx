"use client";

import { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { indianMobileDigits } from "@/lib/phone";

type ForgotPasswordPhoneStepProps = {
  phone: string;
  setPhone: (value: string) => void;
  error: string | null;
  loading: boolean;
  onSendOtp: (e: FormEvent) => void;
  onBackToLogin: () => void;
};

export function ForgotPasswordPhoneStep({
  phone,
  setPhone,
  error,
  loading,
  onSendOtp,
  onBackToLogin,
}: ForgotPasswordPhoneStepProps) {
  const t = useTranslations("auth");

  return (
    <>
      <p className="lead">{t("forgotPasswordLead")}</p>

      {error ? (
        <div className="alert alert--error" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}

      <form className="form-grid" onSubmit={onSendOtp}>
        <div className="field">
          <label htmlFor="login-phone">{t("mobile")}</label>
          <div className="login-phone">
            <span className="login-phone__prefix" aria-hidden="true">
              +91
            </span>
            <input
              id="login-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              autoFocus
              required
              value={phone}
              maxLength={10}
              pattern="[0-9]{10}"
              placeholder={t("mobile")}
              onChange={(e) =>
                setPhone(indianMobileDigits(e.target.value).slice(0, 10))
              }
              disabled={loading}
            />
          </div>
        </div>
        
        <button
          className="btn btn-primary login-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? t("sendingOtp") : t("sendOtp")}
        </button>

        <button
          type="button"
          className="login-link-btn"
          onClick={onBackToLogin}
          disabled={loading}
          style={{ marginTop: "0.5rem" }}
        >
          {t("backToLogin")}
        </button>
      </form>
    </>
  );
}
