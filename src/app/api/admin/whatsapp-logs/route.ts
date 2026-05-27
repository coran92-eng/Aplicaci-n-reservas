import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify admin session
  const sessionCookie = cookies().get("admin_session")?.value;
  if (!sessionCookie || !(await verifyAdminSession(sessionCookie))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reservaId = searchParams.get("reservaId");

  if (!reservaId) {
    return NextResponse.json({ error: "reservaId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("whatsapp_logs")
    .select("id, reserva_id, template, phone, status, message_id, error, sent_at")
    .eq("reserva_id", reservaId)
    .order("sent_at", { ascending: false });

  if (error) {
    console.error("[WHATSAPP_LOGS] Error fetching logs:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}
