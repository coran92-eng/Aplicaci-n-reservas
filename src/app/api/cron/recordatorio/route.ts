import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/emails";
import { addDaysToDate, todayBarcelona } from "@/lib/utils";
import type { Reserva } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tomorrow = addDaysToDate(todayBarcelona(), 1);
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("reservas")
    .select("*")
    .eq("fecha", tomorrow)
    .eq("estado", "confirmada");

  if (error) {
    console.error("[CRON] Error fetching reservas:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  const reservas = (data ?? []) as Reserva[];
  let sent = 0;
  let failed = 0;

  for (const reserva of reservas) {
    try {
      await sendReminderEmail({
        nombre: reserva.nombre,
        apellido: reserva.apellido,
        email: reserva.email,
        fecha: reserva.fecha,
        hora: reserva.hora,
        personas: reserva.personas,
        cancel_token: reserva.cancel_token,
        idioma: reserva.idioma,
      });
      sent++;
    } catch (err) {
      console.error(`[CRON] Reminder failed for ${reserva.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ tomorrow, total: reservas.length, sent, failed });
}
