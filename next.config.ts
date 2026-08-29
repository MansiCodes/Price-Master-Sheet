import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

loadEnv({ path: path.join(__dirname, ".env") });

const authSecret = process.env.AUTH_SECRET ?? "";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Standalone is for Docker/ECS only — leave unset on Vercel.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  outputFileTracingRoot: path.join(__dirname, "."),
  // Force AUTH_SECRET into Edge middleware (fixes JWT "no matching decryption secret").
  env: {
    AUTH_SECRET: authSecret,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
