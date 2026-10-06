import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";

export async function requireAdmin(): Promise<void> {
  const sessionCookie = cookies().get("admin_session")?.value;
  if (!sessionCookie || !(await verifyAdminSession(sessionCookie))) {
    redirect("/admin/login");
  }
}

/** Comprobación sin redirección, para componentes que se montan también sin sesión. */
export async function isAdmin(): Promise<boolean> {
  const sessionCookie = cookies().get("admin_session")?.value;
  return !!sessionCookie && (await verifyAdminSession(sessionCookie));
}
