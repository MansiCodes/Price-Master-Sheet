"use client";

import { LoginForm } from "./LoginForm";
import { LoginVisual } from "./LoginVisual";
import "./login.css";

export default function LoginPage() {
  return (
    <div className="login-screen">
      <LoginVisual />
      <LoginForm />
    </div>
  );
}
