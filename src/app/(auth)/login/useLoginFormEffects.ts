"use client";

import { useEffect } from "react";
import { clearStaleAuthCookies } from "./login-helpers";

export function useLoginFormEffects(
  otpExpiresAt: number | null,
  setOtpSecondsLeft: (value: number) => void,
  setRememberMe: (value: boolean) => void,
) {
  useEffect(() => {
    clearStaleAuthCookies();
    const cookies = document.cookie.split(";").map((c) => c.trim());
    const rememberMeCookie = cookies.find((c) => c.startsWith("cj.remember-me="));
    if (rememberMeCookie) {
      setRememberMe(rememberMeCookie.split("=")[1] === "true");
    }
  }, []);

  useEffect(() => {
    if (!otpExpiresAt) {
      setOtpSecondsLeft(0);
      return;
    }

    function updateCountdown() {
      setOtpSecondsLeft(
        Math.max(0, Math.ceil((otpExpiresAt! - Date.now()) / 1000)),
      );
    }

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [otpExpiresAt]);
}
