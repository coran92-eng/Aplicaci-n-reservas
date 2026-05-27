import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

async function isAdmin(): Promise<boolean> {
  const cookie = (await cookies()).get("admin_session")?.value ?? "";
  return verifyAdminSession(cookie);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { endpoint, p256dh, auth, userAgent } = body as {
    endpoint?: string;
    p256dh?: string;
    auth?: string;
    userAgent?: string;
  };

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const sc = createServiceClient();
  await sc.from("push_subscriptions").upsert(
    { endpoint, p256dh, auth, user_agent: userAgent ?? null },
    { onConflict: "endpoint" }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { endpoint } = body as { endpoint?: string };

  if (!endpoint) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const sc = createServiceClient();
  await sc.from("push_subscriptions").delete().eq("endpoint", endpoint);

  return NextResponse.json({ ok: true });
}
