import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendReminderWithReconfirmacion } from "@/lib/emails";
import { sendReminderWhatsApp } from "@/lib/whatsapp";
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
    .eq("estado", "confirmada")
    .eq("recordatorio_enviado", false);

  if (error) {
    console.error("[CRON] Error fetching reservas:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  const reservas = (data ?? []) as Reserva[];
  let sent = 0;
  let failed = 0;

  for (const reserva of reservas) {
    try {
      await sendReminderWithReconfirmacion({
        nombre: reserva.nombre,
        apellido: reserva.apellido,
        email: reserva.email,
        fecha: reserva.fecha,
        hora: reserva.hora,
        personas: reserva.personas,
        cancel_token: reserva.cancel_token,
        reconfirmacion_token: reserva.reconfirmacion_token ?? "",
        idioma: reserva.idioma,
      });
      await supabase
        .from("reservas")
        .update({ recordatorio_enviado: true })
        .eq("id", reserva.id);
      sent++;
    } catch (err) {
      console.error(`[CRON] Reminder failed for ${reserva.id}:`, err);
      failed++;
    }

    // WhatsApp reminder (fire-and-forget per reserva — non-blocking)
    if (reserva.telefono) {
      sendReminderWhatsApp({
        phone: reserva.telefono,
        nombre: reserva.nombre,
        fecha: reserva.fecha,
        hora: reserva.hora,
        personas: reserva.personas,
        locale: reserva.idioma,
      })
        .then((waResult) =>
          supabase.from("whatsapp_logs").insert({
            reserva_id: reserva.id,
            template: "reserva_recordatorio",
            phone: reserva.telefono,
            status: waResult.error ? "failed" : "sent",
            message_id: waResult.messageId ?? null,
            error: waResult.error ?? null,
          })
        )
        .catch((err) =>
          console.error(`[CRON] WhatsApp reminder failed for ${reserva.id}:`, err)
        );
    }
  }

  return NextResponse.json({ tomorrow, total: reservas.length, sent, failed });
}
