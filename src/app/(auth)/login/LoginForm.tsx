"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toIndiaPhoneE164 } from "@/lib/phone";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { LoginEmailForm } from "./LoginEmailForm";
import { LoginWhatsappOtpForm } from "./LoginWhatsappOtpForm";
import { LoginWhatsappPhoneForm } from "./LoginWhatsappPhoneForm";
import { setRememberMeCookie, type LoginMode, type WhatsappStep } from "./login-helpers";
import { useLoginFormEffects } from "./useLoginFormEffects";

export function LoginForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [mode, setMode] = useState<LoginMode>("whatsapp");
  const [whatsappStep, setWhatsappStep] = useState<WhatsappStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);

  useLoginFormEffects(otpExpiresAt, setOtpSecondsLeft, setRememberMe);

  function switchMode(next: LoginMode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setDevOtp(null);
    if (next === "whatsapp") {
      setWhatsappStep("phone");
      setOtp("");
      setOtpExpiresAt(null);
    }
  }

  async function onSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const e164 = toIndiaPhoneE164(phone);
    if (!e164) {
      setError(t("invalidPhone"));
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164 }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        stub?: boolean;
        devCode?: string;
        expiresAt?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not send OTP.");
        return;
      }

      setWhatsappStep("otp");
      setOtp("");
      setOtpExpiresAt(
        data.expiresAt ? new Date(data.expiresAt).getTime() : Date.now() + 600_000,
      );
      if (data.stub && data.devCode) {
        setDevOtp(data.devCode);
        setOtp(data.devCode);
        setInfo(t("devOtpInfo"));
      } else {
        setDevOtp(null);
        // We already show a dedicated hint on the OTP screen (`otpSentWhatsapp`),
        // so avoid rendering the same "OTP sent..." message twice.
        setInfo(null);
      }
    } catch {
      setError(t("couldNotSendOtp"));
    } finally {
      setSendingOtp(false);
    }
  }

  async function onWhatsappLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (otpSecondsLeft <= 0) {
      setError(t("otpExpiredRequest"));
      return;
    }

    const e164 = toIndiaPhoneE164(phone);
    if (!e164 || otp.trim().length !== 4) {
      setError(t("enterOtp"));
      return;
    }

    setLoading(true);
    try {
      setRememberMeCookie(rememberMe);
      const result = await signIn("credentials", {
        phone: e164,
        code: otp.trim(),
        rememberMe: rememberMe ? "1" : "0",
        redirect: false,
      });
      if (result?.error) {
        setError(t("invalidOtp"));
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError(t("signInFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      setRememberMeCookie(rememberMe);
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        rememberMe: rememberMe ? "1" : "0",
        redirect: false,
      });
      if (result?.error) {
        setError(t("invalidEmailPassword"));
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError(t("signInFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-form-panel">
      <div className="login-form-card">
        <div className="login-form-card__lang">
          <LanguageSwitcher />
        </div>
        <h2>{t("welcomeBack")}</h2>
        <p className="lead">{t("signInLead")}</p>

        <div className="login-mode-tabs" role="tablist" aria-label={t("title")}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "whatsapp"}
            className={mode === "whatsapp" ? "is-active" : ""}
            onClick={() => switchMode("whatsapp")}
          >
            {t("whatsappLogin")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "email"}
            className={mode === "email" ? "is-active" : ""}
            onClick={() => switchMode("email")}
          >
            {t("emailLogin")}
          </button>
        </div>

        {error ? (
          <div className="alert alert--error" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}
        {info ? (
          <div className="alert alert--ok" role="status" aria-live="polite">
            {info}
          </div>
        ) : null}

        {mode === "whatsapp" ? (
          whatsappStep === "phone" ? (
            <LoginWhatsappPhoneForm
              phone={phone}
              setPhone={setPhone}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              sendingOtp={sendingOtp}
              onSendOtp={onSendOtp}
            />
          ) : (
            <LoginWhatsappOtpForm
              otp={otp}
              setOtp={setOtp}
              otpSecondsLeft={otpSecondsLeft}
              devOtp={devOtp}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              loading={loading}
              sendingOtp={sendingOtp}
              onWhatsappLogin={onWhatsappLogin}
              onChangeNumber={() => {
                setWhatsappStep("phone");
                setOtp("");
                setDevOtp(null);
                setOtpExpiresAt(null);
                setInfo(null);
                setError(null);
              }}
            />
          )
        ) : (
          <LoginEmailForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            rememberMe={rememberMe}
            setRememberMe={setRememberMe}
            loading={loading}
            onEmailSubmit={onEmailSubmit}
            onForgotPassword={() =>
              router.push(
                phone.trim()
                  ? `/forgot-password?phone=${encodeURIComponent(phone.trim())}`
                  : "/forgot-password",
              )
            }
          />
        )}
      </div>
    </section>
  );
}
