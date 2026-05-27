import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Enkel edge-safe middleware som bara kollar om en Auth.js session-cookie
 * finns. Strikt validering (mot DB) sker i server components via
 * `requireUser()` / `requireUserApi()` i lib/api.ts.
 *
 * Vi använder INTE NextAuth(authConfig) här eftersom det skulle försöka
 * dekoda cookien som JWT — vi kör database sessions (krävs av Resend
 * magic links + Prisma adapter), så cookien är ett session-ID, inte en JWT.
 */

const PUBLIC_PATHS = ["/signin", "/api/auth"];

// Auth.js v5 cookie-namn (prod använder __Secure-prefix när AUTH_URL är https://)
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession = SESSION_COOKIES.some((name) => req.cookies.get(name));

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon|version).*)"],
};
