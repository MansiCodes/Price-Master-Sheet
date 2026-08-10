import type { NextConfig } from "next";
import path from "node:path";

const authSecret = process.env.AUTH_SECRET ?? "";

const nextConfig: NextConfig = {
  // Force AUTH_SECRET into Edge middleware (fixes JWT "no matching decryption secret").
  env: {
    AUTH_SECRET: authSecret,
  },
  // Monorepo: silence wrong workspace-root inference when multiple lockfiles exist.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
