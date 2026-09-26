"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { requestPasswordResetOtp, resetPasswordWithOtp, verifyPasswordResetOtp } from "@/app/actions/password-reset";
import { indianMobileDigits, toIndiaPhoneE164 } from "@/lib/phone";
import { LoginVisual } from "../login/LoginVisual";
import { ForgotPasswordOtpStep } from "./ForgotPasswordOtpStep";
import { ForgotPasswordPasswordStep } from "./ForgotPasswordPasswordStep";
import { ForgotPasswordPhoneStep } from "./ForgotPasswordPhoneStep";

export function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");

  const [step, setStep] = useState<"phone" | "otp" | "password">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  useEffect(() => {
    const phoneParam = searchParams.get("phone") || "";
    if (phoneParam) {
      setPhone(indianMobileDigits(phoneParam));
    }
  }, [searchParams]);

  async function onSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const e164 = toIndiaPhoneE164(phone);
    if (!e164) {
      setError(t("invalidPhone"));
      return;
    }

    setLoading(true);

    try {
      const res = await requestPasswordResetOtp(e164);
      if (res.ok) {
        setStep("otp");
        if (res.stub && res.devCode) {
          setDevOtp(res.devCode);
          setOtp(res.devCode);
        } else {
          setDevOtp(null);
        }
      } else {
        setError(res.error ? t(res.error) : tErrors("generic"));
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const e164 = toIndiaPhoneE164(phone);
    if (!e164) {
      setError(t("invalidPhone"));
      return;
    }

    if (otp.trim().length !== 4) {
      setError(t("enterOtp"));
      return;
    }

    setLoading(true);

    try {
      const res = await verifyPasswordResetOtp(e164, otp);
      if (res.ok) {
        setStep("password");
      } else {
        setError(res.error ? t(res.error) : tErrors("generic"));
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const e164 = toIndiaPhoneE164(phone);
    if (!e164) {
      setError(t("invalidPhone"));
      return;
    }

    if (otp.trim().length !== 4) {
      setError(t("enterOtp"));
      return;
    }

    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    setLoading(true);

    try {
      const res = await resetPasswordWithOtp(e164, otp, password);
      if (res.ok) {
        setInfo(t("passwordResetSuccess"));
      } else {
        setError(res.error ? t(res.error) : tErrors("generic"));
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <LoginVisual />

      <section className="login-form-panel">
        <div className="login-form-card">
          <div className="login-form-card__lang">
            <LanguageSwitcher />
          </div>
          <h2>{t("forgotPasswordTitle")}</h2>
          
          {info ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" }}>
              <div className="alert alert--ok" role="status" aria-live="polite" style={{ margin: 0 }}>
                {info}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => router.push("/login")}
                style={{ width: "100%" }}
              >
                {t("backToLogin")}
              </button>
            </div>
          ) : step === "phone" ? (
            <ForgotPasswordPhoneStep
              phone={phone}
              setPhone={setPhone}
              error={error}
              loading={loading}
              onSendOtp={onSendOtp}
              onBackToLogin={() => router.push("/login")}
            />
          ) : step === "otp" ? (
            <ForgotPasswordOtpStep
              otp={otp}
              setOtp={setOtp}
              error={error}
              devOtp={devOtp}
              loading={loading}
              onVerifyOtp={onVerifyOtp}
              onChangeNumber={() => {
                setStep("phone");
                setError(null);
                setDevOtp(null);
              }}
            />
          ) : (
            <ForgotPasswordPasswordStep
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              error={error}
              loading={loading}
              onResetPassword={onResetPassword}
              onBackToOtp={() => {
                setStep("otp");
                setError(null);
              }}
            />
          )}
        </div>
      </section>
    </div>
  );
}
