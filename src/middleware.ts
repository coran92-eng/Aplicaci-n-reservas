import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";

const intlMiddleware = createMiddleware({
  locales: ["es", "ca", "en"],
  defaultLocale: "es",
  localeDetection: true,
});

const CANONICAL_HOST = "reservas.cortedemanga.es";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Redirect the raw Vercel deployment URL to the custom domain
  const host = req.headers.get("host") ?? "";
  if (host.endsWith(".vercel.app")) {
    const url = req.nextUrl.clone();
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();

    const sessionCookie = req.cookies.get("admin_session")?.value;
    const isValid = sessionCookie
      ? await verifyAdminSession(sessionCookie)
      : false;

    if (!isValid) {
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)" ],
};
