import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Dev-only inloggning som hoppar över Google OAuth.
 *
 * Skapar en vanlig Auth.js database-session för kontot i DEV_LOGIN_EMAIL och
 * sätter session-cookien. Ingen inloggningsuppgift passerar här och kontot går
 * inte att välja via request — bara env-variabeln bestämmer vem det blir.
 *
 * Tre spärrar, alla måste gälla:
 *   1. NODE_ENV === "development"
 *   2. Inte på Vercel (VERCEL är satt i alla Vercel-miljöer)
 *   3. DEV_LOGIN_EMAIL satt i .env (finns inte i .env.example, opt-in lokalt)
 *
 * Slår någon av dem fel svarar routen 404, precis som en route som inte finns.
 *
 * OBS: DATABASE_URL pekar mot Neon, så sessionen skapas i den databas .env
 * pekar ut. Kör den inte med en produktions-DATABASE_URL i .env.
 */
const enabled =
  process.env.NODE_ENV === "development" &&
  !process.env.VERCEL &&
  !!process.env.DEV_LOGIN_EMAIL;

const SESSION_MAX_AGE_DAYS = 30;

export async function GET(req: Request) {
  if (!enabled) return new NextResponse("Not found", { status: 404 });

  const email = process.env.DEV_LOGIN_EMAIL!;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: `Ingen användare med e-post ${email}` },
      { status: 404 }
    );
  }

  const sessionToken = randomUUID();
  const expires = new Date(
    Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  );
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  const callbackUrl = new URL(req.url).searchParams.get("callbackUrl") || "/";
  // Relativ path bara — annars kan routen användas som open redirect.
  // "//host" och "/\\host" tolkas som annan origin, så de avvisas också.
  const target =
    callbackUrl.startsWith("/") && !/^\/[\/\\]/.test(callbackUrl)
      ? callbackUrl
      : "/";

  const res = NextResponse.redirect(new URL(target, req.url));
  res.cookies.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    expires,
  });
  return res;
}
