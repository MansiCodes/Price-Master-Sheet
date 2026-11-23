import type { FormEvent } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { signIn } from "next-auth/react";
import { toIndiaPhoneE164 } from "@/lib/phone";
import { setRememberMeCookie } from "./login-helpers";

type Translate = (key: string) => string;

export function createLoginFormHandlers(params: {
  t: Translate;
  router: AppRouterInstance;
  phone: string;
  otp: string;
  email: string;
  password: string;
  rememberMe: boolean;
  otpSecondsLeft: number;
  setError: (v: string | null) => void;
  setInfo: (v: string | null) => void;
  setLoading: (v: boolean) => void;
  setSendingOtp: (v: boolean) => void;
  setWhatsappStep: (v: "phone" | "otp") => void;
  setOtp: (v: string) => void;
  setOtpExpiresAt: (v: number | null) => void;
  setDevOtp: (v: string | null) => void;
}) {
  const {
    t,
    router,
    phone,
    otp,
    email,
    password,
    rememberMe,
    otpSecondsLeft,
    setError,
    setInfo,
    setLoading,
    setSendingOtp,
    setWhatsappStep,
    setOtp,
    setOtpExpiresAt,
    setDevOtp,
  } = params;

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
      // Amplify P&L: stay here. /apps is the centralisation chooser (localhost:5173).
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

  return { onSendOtp, onWhatsappLogin, onEmailSubmit };
}