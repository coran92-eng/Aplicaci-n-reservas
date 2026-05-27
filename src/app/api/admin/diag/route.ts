import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  // Basic auth check (same as middleware)
  const sessionCookie = cookies().get("admin_session")?.value;
  let sessionValid = false;
  try {
    sessionValid = sessionCookie ? await verifyAdminSession(sessionCookie) : false;
  } catch (e) {
    return NextResponse.json({ error: "auth_error", message: String(e) }, { status: 401 });
  }
  if (!sessionValid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const checks: Record<string, unknown> = {};

  // 1. Env vars
  checks.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_MAGIC_LINK_SECRET: !!process.env.ADMIN_MAGIC_LINK_SECRET,
    ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ?? "(missing)",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "(missing)",
  };

  // 2. Supabase service client
  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = createServiceClient();
    checks.supabase_client = "ok";

    // 3. DB query
    try {
      const { data, error } = await supabase
        .from("reservas")
        .select("id")
        .limit(1);
      checks.db_query = error ? { error: error.message, code: error.code } : { ok: true, rows: data?.length ?? 0 };
    } catch (e) {
      checks.db_query = { error: String(e) };
    }

    // 4. ENUM query
    try {
      const { data, error } = await supabase
        .from("reservas")
        .select("id")
        .eq("estado", "pendiente_aprobacion")
        .limit(1);
      checks.enum_query = error ? { error: error.message, code: error.code } : { ok: true, rows: data?.length ?? 0 };
    } catch (e) {
      checks.enum_query = { error: String(e) };
    }
  } catch (e) {
    checks.supabase_client = { error: String(e) };
  }

  // 5. web-push import
  try {
    await import("web-push");
    checks.web_push = "ok";
  } catch (e) {
    checks.web_push = { error: String(e) };
  }

  // 6. PendientesList import (triggers full client component module resolution)
  try {
    await import("@/components/admin/PendientesList");
    checks.pendientes_list_import = "ok";
  } catch (e) {
    checks.pendientes_list_import = { error: String(e) };
  }

  return NextResponse.json({ status: "ok", checks }, { status: 200 });
}
