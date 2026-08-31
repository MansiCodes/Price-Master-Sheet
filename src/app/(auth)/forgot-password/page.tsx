"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { requestPasswordResetOtp, resetPasswordWithOtp, verifyPasswordResetOtp } from "@/app/actions/password-reset";
import { indianMobileDigits, toIndiaPhoneE164 } from "@/lib/phone";
import "../login/login.css";

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" x2="22" y1="2" y2="22" />
      </svg>
    );
  }

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ForgotPasswordForm() {
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
      <section className="login-visual" aria-hidden="true">
        <div className="login-visual__blob login-visual__blob--teal" />
        <div className="login-visual__blob login-visual__blob--coral" />
        <div className="login-visual__blob login-visual__blob--amber" />

        <svg
          className="login-visual__cables"
          viewBox="0 0 640 820"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <linearGradient id="cableGradA" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0f766e" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="cableGradB" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="cableGradC" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#0f766e" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {[
            { d: "M -60,110 C 140,170 240,300 430,350", grad: "cableGradA" },
            { d: "M -60,280 C 110,270 280,410 430,350", grad: "cableGradC" },
            { d: "M -60,470 C 150,440 270,380 430,350", grad: "cableGradA" },
            { d: "M -60,650 C 190,600 300,420 430,350", grad: "cableGradC" },
            { d: "M 430,350 C 500,430 540,560 520,720", grad: "cableGradB" },
            { d: "M 430,350 C 490,390 610,410 700,370", grad: "cableGradB" },
          ].map((c, i) => (
            <path
              key={`wire-${i}`}
              className="cable-wire"
              d={c.d}
              stroke={`url(#${c.grad})`}
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          ))}
          <path
            className="cable-line cable-line--1"
            d="M -60,110 C 140,170 240,300 430,350"
            stroke="url(#cableGradA)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            className="cable-line cable-line--2"
            d="M -60,280 C 110,270 280,410 430,350"
            stroke="url(#cableGradC)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            className="cable-line cable-line--3"
            d="M -60,470 C 150,440 270,380 430,350"
            stroke="url(#cableGradA)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            className="cable-line cable-line--4"
            d="M -60,650 C 190,600 300,420 430,350"
            stroke="url(#cableGradC)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            className="cable-line cable-line--5"
            d="M 430,350 C 500,430 540,560 520,720"
            stroke="url(#cableGradB)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            className="cable-line cable-line--6"
            d="M 430,350 C 490,390 610,410 700,370"
            stroke="url(#cableGradB)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <circle className="cable-ring cable-ring--1" cx="430" cy="350" r="10" stroke="#fb7185" strokeWidth="1.5" />
          <circle className="cable-ring cable-ring--2" cx="430" cy="350" r="10" stroke="#f59e0b" strokeWidth="1.5" />
          <circle className="cable-node" cx="430" cy="350" r="7" fill="#fff" />
        </svg>

        <div className="login-visual__content">
          <h1 className="login-visual__brand">{t("brandName")}</h1>
          <p className="login-visual__tagline">{t("tagline")}</p>
        </div>
      </section>

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
                  onClick={() => router.push("/login")}
                  disabled={loading}
                  style={{ marginTop: "0.5rem" }}
                >
                  {t("backToLogin")}
                </button>
              </form>
            </>
          ) : step === "otp" ? (
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
                  onClick={() => {
                    setStep("phone");
                    setError(null);
                    setDevOtp(null);
                  }}
                  disabled={loading}
                  style={{ marginTop: "0.5rem" }}
                >
                  {t("changeNumber")}
                </button>
              </form>
            </>
          ) : (
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
                  onClick={() => {
                    setStep("otp");
                    setError(null);
                  }}
                  disabled={loading}
                  style={{ marginTop: "0.5rem" }}
                >
                  {t("backToLogin")} {/* Go back to OTP verification */}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
