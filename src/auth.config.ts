import type { NextAuthConfig } from "next-auth";

/** Session cookie name — bump version whenever AUTH_SECRET rotates so old JWTs are ignored. */
export const SESSION_COOKIE = "cj.session-token.v3";

/**
 * Edge-compatible Auth.js config used by middleware.
 * Keep this free of Node-only imports (Prisma, bcrypt, etc.).
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  // Browser-session cookie: closing the browser requires login again.
  // JWT also expires after 8 hours if the tab is left open.
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 60 * 8,
  },
  jwt: {
    maxAge: 60 * 60 * 8,
  },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/cron")
      ) {
        return true;
      }

      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.email = user.email;
        token.globalRole = user.globalRole;
        token.canViewPriceSheet = user.canViewPriceSheet;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email =
          (token.email as string | null | undefined) ?? session.user.email;
        session.user.globalRole = token.globalRole as typeof session.user.globalRole;
        session.user.canViewPriceSheet = Boolean(token.canViewPriceSheet);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
