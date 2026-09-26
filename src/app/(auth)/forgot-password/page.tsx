"use client";

import { Suspense } from "react";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import "../login/login.css";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
