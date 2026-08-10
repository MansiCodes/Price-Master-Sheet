"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import "./login.css";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clearStaleAuthCookies();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
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
          {error ? (
            <div className="alert alert--error" role="alert" aria-live="assertive">
              {error}
            </div>
          ) : null}
          <form className="form-grid" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary login-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
