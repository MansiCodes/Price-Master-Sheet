import type { GlobalRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    globalRole: GlobalRole;
    canViewPriceSheet: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      globalRole: GlobalRole;
      canViewPriceSheet: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email?: string | null;
    globalRole: GlobalRole;
    canViewPriceSheet: boolean;
  }
}

export {};
