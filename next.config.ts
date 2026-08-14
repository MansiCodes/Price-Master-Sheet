import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import path from "node:path";

loadEnv({ path: path.join(__dirname, ".env") });

const authSecret = process.env.AUTH_SECRET ?? "";

const nextConfig: NextConfig = {
  // Force AUTH_SECRET into Edge middleware (fixes JWT "no matching decryption secret").
  env: {
    AUTH_SECRET: authSecret,
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

export default nextConfig;
