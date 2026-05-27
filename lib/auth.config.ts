import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

/**
 * Edge-säker auth-konfig — INGEN PrismaAdapter eller andra Node-bara imports.
 * Används av middleware och utökas i lib/auth.ts med adapter + session strategy.
 */
export default {
  providers: [
    ...(process.env.AUTH_RESEND_KEY
      ? [
          Resend({
            apiKey: process.env.AUTH_RESEND_KEY,
            from: process.env.EMAIL_FROM || "Tyra Life <onboarding@resend.dev>",
          }),
        ]
      : []),
    ...(process.env.AUTH_GOOGLE_ID
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin?check=email",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic =
        nextUrl.pathname.startsWith("/signin") ||
        nextUrl.pathname.startsWith("/api/auth");
      if (isPublic) return true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
