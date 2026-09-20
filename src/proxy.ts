import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/studio") && role !== "SELLER" && role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/sell";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Every admin account can view or approve seller ID/business-license
  // documents (see /admin/sellers/[id]) — that's sensitive enough that a
  // password alone shouldn't be the only thing standing between an attacker
  // and every seller's ID on file. 2FA is opt-in for everyone else, but
  // mandatory here: an admin without it enabled gets bounced to Settings to
  // set it up before touching anything else in /admin.
  if (pathname.startsWith("/admin") && role === "ADMIN" && !req.auth?.user?.has2FA) {
    const url = req.nextUrl.clone();
    url.pathname = "/settings";
    url.search = "?require2fa=1";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/studio/:path*", "/admin/:path*"],
};
