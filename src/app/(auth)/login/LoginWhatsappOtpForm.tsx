"use client";

import { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { setRememberMeCookie } from "./login-helpers";

type LoginWhatsappOtpFormProps = {
  otp: string;
  setOtp: (value: string) => void;
  otpSecondsLeft: number;
  devOtp: string | null;
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
  loading: boolean;
  sendingOtp: boolean;
  onWhatsappLogin: (e: FormEvent) => void;
  onChangeNumber: () => void;
};

export function LoginWhatsappOtpForm({
  otp,
  setOtp,
  otpSecondsLeft,
  devOtp,
  rememberMe,
  setRememberMe,
  loading,
  sendingOtp,
  onWhatsappLogin,
  onChangeNumber,
}: LoginWhatsappOtpFormProps) {
  const t = useTranslations("auth");

  return (
    <form className="form-grid" onSubmit={onWhatsappLogin}>
      <p className="login-otp-hint">{t("otpSentWhatsapp")}</p>
      <p
        className={`login-otp-expiry${
          otpSecondsLeft <= 0 ? " is-expired" : ""
        }`}
        role="timer"
        aria-live="polite"
      >
        {otpSecondsLeft > 0
          ? t("otpExpiresIn", {
              time: `${String(
                Math.floor(otpSecondsLeft / 60),
              ).padStart(2, "0")}:${String(
                otpSecondsLeft % 60,
              ).padStart(2, "0")}`,
            })
          : t("otpExpired")}
      </p>
      {devOtp ? (
        <div className="login-dev-otp" role="status" aria-live="polite">
          <span className="login-dev-otp__label">{t("devOtpLabel")}</span>
          <strong className="login-dev-otp__code">{devOtp}</strong>
          <span className="login-dev-otp__note">{t("devOtpNote")}</span>
        </div>
      ) : null}
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
        />
      </div>
      <label className="login-remember-me">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => {
            const next = e.target.checked;
            setRememberMe(next);
            setRememberMeCookie(next);
          }}
        />
        <span>{t("rememberMe")}</span>
      </label>
      <button
        className="btn btn-primary login-submit"
        type="submit"
        disabled={loading || otpSecondsLeft <= 0}
      >
        {loading ? t("signingIn") : t("verifyLogin")}
      </button>
      <button
        type="button"
        className="login-link-btn"
        disabled={loading || sendingOtp}
        onClick={onChangeNumber}
      >
        {t("changeNumber")}
      </button>
    </form>
  );
}
