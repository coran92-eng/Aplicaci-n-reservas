import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyMagicLink, createAdminSession } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";

  const valid = await verifyMagicLink(token);
  if (!valid) {
    return NextResponse.redirect(new URL("/admin/login?error=magic_expired", req.url));
  }

  const session = await createAdminSession();
  cookies().set("admin_session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return NextResponse.redirect(new URL("/admin", req.url));
}
