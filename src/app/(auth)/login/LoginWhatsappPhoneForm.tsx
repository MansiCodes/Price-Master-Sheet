"use client";

import { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { indianMobileDigits } from "@/lib/phone";
import { setRememberMeCookie } from "./login-helpers";

type LoginWhatsappPhoneFormProps = {
  phone: string;
  setPhone: (value: string) => void;
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
  sendingOtp: boolean;
  onSendOtp: (e: FormEvent) => void;
};

export function LoginWhatsappPhoneForm({
  phone,
  setPhone,
  rememberMe,
  setRememberMe,
  sendingOtp,
  onSendOtp,
}: LoginWhatsappPhoneFormProps) {
  const t = useTranslations("auth");

  return (
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
          />
        </div>
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
        disabled={sendingOtp}
      >
        {sendingOtp ? t("sendingOtp") : t("sendOtp")}
      </button>
    </form>
  );
}
