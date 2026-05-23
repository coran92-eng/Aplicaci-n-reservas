"use server";

import { timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

function getClientIp(): string {
  const h = headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

async function checkAdminRateLimit(ip: string): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  try {
    const client = createServiceClient();
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count, error } = await client
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("identifier", `admin:${ip}`)
      .eq("action", "admin_login")
      .gte("created_at", windowStart);
    if (error) return true;
    if ((count ?? 0) >= 5) return false;
    await client
      .from("rate_limits")
      .insert({ identifier: `admin:${ip}`, action: "admin_login" });
    return true;
  } catch {
    return true;
  }
}

export async function loginAdmin(
  _: unknown,
  formData: FormData
): Promise<{ error: string } | never> {
  const password = (formData.get("password") as string) ?? "";
  const ip = getClientIp();

  if (!(await checkAdminRateLimit(ip))) {
    return { error: "rate_limit" };
  }

  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedPassword || !password) {
    return { error: "incorrect" };
  }

  let matches = false;
  try {
    matches = timingSafeEqual(
      Buffer.from(password),
      Buffer.from(expectedPassword)
    );
  } catch {
    matches = false;
  }

  if (!matches) {
    return { error: "incorrect" };
  }

  const session = await createAdminSession();
  cookies().set("admin_session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  redirect("/admin");
}

export async function logoutAdmin() {
  cookies().delete("admin_session");
  redirect("/admin/login");
}
