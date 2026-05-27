"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createServiceClient } from "@/lib/supabase/server";
import {
  sendConfirmationWhatsApp,
  sendReminderWhatsApp,
} from "@/lib/whatsapp";

export async function sendManualWhatsApp(
  reservaId: string,
  template: "reserva_confirmada" | "reserva_recordatorio"
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const supabase = createServiceClient();

  const { data: reserva, error: fetchError } = await supabase
    .from("reservas")
    .select("nombre, apellido, telefono, fecha, hora, personas, idioma")
    .eq("id", reservaId)
    .single();

  if (fetchError || !reserva) {
    return { ok: false, error: "not_found" };
  }

  let result: { messageId?: string; error?: string };

  if (template === "reserva_confirmada") {
    result = await sendConfirmationWhatsApp({
      phone: reserva.telefono,
      nombre: reserva.nombre,
      fecha: reserva.fecha,
      hora: reserva.hora,
      personas: reserva.personas,
      locale: reserva.idioma,
      reservaId,
    });
  } else {
    result = await sendReminderWhatsApp({
      phone: reserva.telefono,
      nombre: reserva.nombre,
      fecha: reserva.fecha,
      hora: reserva.hora,
      personas: reserva.personas,
      locale: reserva.idioma,
    });
  }

  await supabase.from("whatsapp_logs").insert({
    reserva_id: reservaId,
    template,
    phone: reserva.telefono,
    status: result.error ? "failed" : "sent",
    message_id: result.messageId ?? null,
    error: result.error ?? null,
  });

  if (result.error) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
