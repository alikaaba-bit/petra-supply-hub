import NextAuth from "next-auth";
import { authConfig } from "@/server/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isAuthPage = nextUrl.pathname.startsWith("/login");
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isApiCronRoute = nextUrl.pathname.startsWith("/api/cron");
  const isPublicFile =
    nextUrl.pathname.startsWith("/_next") ||
    nextUrl.pathname.startsWith("/favicon.ico") ||
    nextUrl.pathname.includes(".");

  // Allow auth routes, cron routes (use their own auth), and public files
  if (isApiAuthRoute || isApiCronRoute || isPublicFile) {
    return;
  }

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return Response.redirect(new URL("/", nextUrl.origin));
  }

  // Redirect non-logged-in users to login
  if (!isAuthPage && !isLoggedIn) {
    const callbackUrl = nextUrl.pathname + nextUrl.search;
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
