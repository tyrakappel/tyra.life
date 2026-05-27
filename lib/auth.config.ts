import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

/**
 * Edge-säker auth-konfig — INGEN PrismaAdapter eller andra Node-bara imports.
 * Används av middleware och utökas i lib/auth.ts med adapter + session strategy.
 */
const hasResend = !!process.env.AUTH_RESEND_KEY;
const hasGoogle =
  !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

export default {
  // På Vercel auto-detekteras detta via VERCEL-env, men explicit är säkrare
  // mot config-fel ifall någon proxy framför står i vägen.
  trustHost: true,
  providers: [
    ...(hasResend
      ? [
          Resend({
            apiKey: process.env.AUTH_RESEND_KEY!,
            from: process.env.EMAIL_FROM || "Tyra Life <onboarding@resend.dev>",
          }),
        ]
      : []),
    ...(hasGoogle
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin?check=email",
    error: "/signin", // visa fel på signin-sidan istället för default error page
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
  // Logga auth-händelser i prod för Vercel-logs så vi kan felsöka
  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig;
