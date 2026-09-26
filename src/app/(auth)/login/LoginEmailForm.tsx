"use client";

import { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { PasswordEyeIcon } from "./PasswordEyeIcon";
import { setRememberMeCookie } from "./login-helpers";

type LoginEmailFormProps = {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean | ((prev: boolean) => boolean)) => void;
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
  loading: boolean;
  onEmailSubmit: (e: FormEvent) => void;
  onForgotPassword: () => void;
};

export function LoginEmailForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberMe,
  setRememberMe,
  loading,
  onEmailSubmit,
  onForgotPassword,
}: LoginEmailFormProps) {
  const t = useTranslations("auth");

  return (
    <form className="form-grid" onSubmit={onEmailSubmit}>
      <div className="field">
        <label htmlFor="email">{t("email")}</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="password">{t("password")}</label>
        <div className="login-password">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: "0.5rem", marginBottom: "0.75rem" }}>
        <label className="login-remember-me" style={{ margin: 0 }}>
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
          type="button"
          className="login-link-btn"
          onClick={onForgotPassword}
          style={{ fontSize: "0.85rem", fontWeight: "bold" }}
        >
          {t("forgotPassword")}
        </button>
      </div>
      <button
        className="btn btn-primary login-submit"
        type="submit"
        disabled={loading}
      >
        {loading ? t("signingIn") : t("signInEmail")}
      </button>
    </form>
  );
}
