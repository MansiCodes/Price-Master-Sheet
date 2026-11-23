"use client";

import { useTranslations } from "next-intl";

export function LoginVisual() {
  const t = useTranslations("auth");

  return (
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
  );
}
