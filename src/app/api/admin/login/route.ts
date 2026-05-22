import { NextRequest, NextResponse } from "next/server";

async function deriveToken(password: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(password));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedPassword) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 500 });
    }

    if (password !== expectedPassword) {
      await new Promise((r) => setTimeout(r, 500)); // Delay para prevenir brute force
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const secret = process.env.ADMIN_MAGIC_LINK_SECRET ?? "";
    const token = await deriveToken(password, secret);

    const response = NextResponse.json({ ok: true });
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30 días
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
