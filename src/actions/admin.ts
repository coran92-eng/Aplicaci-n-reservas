"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSession } from "@/lib/admin-auth";

export async function loginAdmin(
  _: unknown,
  formData: FormData
): Promise<{ error: string } | never> {
  const password = formData.get("password") as string;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return { error: "incorrect" };
  }

  const session = await createAdminSession();
  cookies().set("admin_session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  redirect("/admin");
}

export async function logoutAdmin() {
  cookies().delete("admin_session");
  redirect("/admin/login");
}
