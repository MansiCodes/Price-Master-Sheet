"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  indianMobileDigits,
  toIndiaPhoneE164,
} from "@/lib/phone";
import "./login.css";

type LoginMode = "whatsapp" | "email";
type WhatsappStep = "phone" | "otp";

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

/** Drop legacy Auth.js cookies so Edge middleware stops trying to decrypt them. */
function clearStaleAuthCookies() {
  const stale = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "cj.session-token",
  ];
  for (const name of stale) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    for (let i = 0; i < 5; i += 1) {
      document.cookie = `${name}.${i}=; Max-Age=0; path=/`;
    }
  }
}

export default function LoginPage() {
  const router = useRouter();
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

  useEffect(() => {
    clearStaleAuthCookies();
  }, []);

  function switchMode(next: LoginMode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setDevOtp(null);
    if (next === "whatsapp") {
      setWhatsappStep("phone");
      setOtp("");
    }
  }

  async function onSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const e164 = toIndiaPhoneE164(phone);
    if (!e164) {
      setError("Enter a valid 10-digit mobile number.");
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
      };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not send OTP.");
        return;
      }

      setWhatsappStep("otp");
      setOtp("");
      if (data.stub && data.devCode) {
        setDevOtp(data.devCode);
        setOtp(data.devCode);
        setInfo(
          "WhatsApp OTP is not configured yet (Admin → Integrations). Using local Dev OTP for now.",
        );
      } else {
        setDevOtp(null);
        setInfo("OTP sent to your WhatsApp number.");
      }
    } catch {
      setError("Could not send OTP. Try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function onWhatsappLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const e164 = toIndiaPhoneE164(phone);
    if (!e164 || otp.trim().length < 4) {
      setError("Enter the OTP sent to your mobile.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        phone: e164,
        code: otp.trim(),
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid or expired OTP.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Sign-in failed. Try again.");
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
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Sign-in failed. Try again.");
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
          <h1 className="login-visual__brand">Cable Junction</h1>
          <p className="login-visual__tagline">
            Every plant&rsquo;s numbers, wired into one place.
          </p>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-card">
          <h2>Welcome back</h2>
          <p className="lead">Sign in to enter plant data.</p>

          <div className="login-mode-tabs" role="tablist" aria-label="Sign-in method">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "whatsapp"}
              className={mode === "whatsapp" ? "is-active" : ""}
              onClick={() => switchMode("whatsapp")}
            >
              WhatsApp login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "email"}
              className={mode === "email" ? "is-active" : ""}
              onClick={() => switchMode("email")}
            >
              Email login
            </button>
          </div>

          <p className="login-alt-hint">
            Waiting for WhatsApp OTP setup? Use <strong>Email login</strong> with
            your account email and password.
          </p>

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
              <form className="form-grid" onSubmit={onSendOtp}>
                <div className="field">
                  <label htmlFor="login-phone">Mobile number</label>
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
                      placeholder="Mobile number"
                      onChange={(e) =>
                        setPhone(indianMobileDigits(e.target.value).slice(0, 10))
                      }
                    />
                  </div>
                </div>
                <button
                  className="btn btn-primary login-submit"
                  type="submit"
                  disabled={sendingOtp}
                >
                  {sendingOtp ? "Sending OTP…" : "Send OTP"}
                </button>
              </form>
            ) : (
              <form className="form-grid" onSubmit={onWhatsappLogin}>
                <p className="login-otp-hint">
                  OTP sent to <strong>+91 {phone}</strong>
                </p>
                {devOtp ? (
                  <div className="login-dev-otp" role="status" aria-live="polite">
                    <span className="login-dev-otp__label">Dev OTP</span>
                    <strong className="login-dev-otp__code">{devOtp}</strong>
                    <span className="login-dev-otp__note">
                      Local testing only — removed when WhatsApp template is live
                    </span>
                  </div>
                ) : null}
                <div className="field">
                  <label htmlFor="login-otp">Enter OTP</label>
                  <input
                    id="login-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    maxLength={6}
                    pattern="[0-9]{4,6}"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                </div>
                <button
                  className="btn btn-primary login-submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Signing in…" : "Login"}
                </button>
                <button
                  type="button"
                  className="login-link-btn"
                  disabled={loading || sendingOtp}
                  onClick={() => {
                    setWhatsappStep("phone");
                    setOtp("");
                    setDevOtp(null);
                    setInfo(null);
                    setError(null);
                  }}
                >
                  Change number
                </button>
              </form>
            )
          ) : (
            <form className="form-grid" onSubmit={onEmailSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="login-password">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="login-password__toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={loading}
                  >
                    <PasswordEyeIcon visible={showPassword} />
                  </button>
                </div>
              </div>
              <button
                className="btn btn-primary login-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
