import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Kör inte middleware på statiska assets, API:t (handlers hanterar själv),
  // version-endpoint, eller signin-sidan.
  matcher: ["/((?!api|_next/static|_next/image|favicon|version).*)"],
};
