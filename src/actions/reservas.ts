"use server";

import { randomUUID } from "crypto";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { reservaSchema } from "@/lib/validations";
import {
  sendConfirmationEmail,
  sendPendingEmail,
  sendCancellationEmail,
} from "@/lib/emails";
import { todayBarcelona, nowBarcelona } from "@/lib/utils";
import { headers } from "next/headers";
import type {
  Reserva,
  Configuracion,
  CancelarReservaResult,
} from "@/lib/supabase/types";

// Rate limiter basado en Supabase (funciona en entornos serverless como Vercel)
async function checkRateLimit(ip: string): Promise<boolean> {
  const serviceClient = createServiceClient();
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await serviceClient
    .from("rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("identifier", ip)
    .eq("action", "create_reserva")
    .gte("created_at", windowStart);

  if (error) return true; // Si hay error en el check, permitir (fail open)
  if ((count ?? 0) >= 3) return false;

  await serviceClient.from("rate_limits").insert({
    identifier: ip,
    action: "create_reserva",
  });

  return true;
}

function getClientIp(): string {
  const headersList = headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    "unknown"
  );
}

export type CreateReservaResult =
  | { ok: true; id: string; estado: string; emailSent?: boolean }
  | { ok: false; error: string; field?: string };

export async function createReserva(
  formData: unknown
): Promise<CreateReservaResult> {
  const parsed = reservaSchema.safeParse(formData);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { ok: false, error: first.message, field: first.path[0] as string };
  }

  const data = parsed.data;

  if (data.website && data.website.length > 0) {
    return { ok: true, id: "honeypot", estado: "confirmada" };
  }

  const ip = getClientIp();
  if (!(await checkRateLimit(ip))) {
    return { ok: false, error: "rate_limit" };
  }

  const supabase = createClient();

  const { data: configRows } = (await supabase
    .from("configuracion")
    .select("clave, valor")) as { data: Configuracion[] | null };

  const config: Record<string, unknown> = {};
  for (const row of configRows ?? []) {
    config[row.clave] = row.valor;
  }

  const limiteGrupo = (config.limite_grupo_online as number) ?? 7;
  const antelacionMax = (config.antelacion_maxima_dias as number) ?? 90;
  const topeActivo = Boolean(config.tope_por_franja_activo);
  const topePersonas = (config.tope_por_franja_personas as number) ?? 30;

  const todayStr = todayBarcelona();
  if (data.fecha < todayStr) {
    return { ok: false, error: "fecha_past", field: "fecha" };
  }

  const maxDate = new Date(todayStr);
  maxDate.setDate(maxDate.getDate() + antelacionMax);
  const maxDateStr = maxDate.toISOString().slice(0, 10);
  if (data.fecha > maxDateStr) {
    return { ok: false, error: "fecha_max", field: "fecha" };
  }

  const { data: diaCerrado } = await supabase
    .from("dias_cerrados")
    .select("id")
    .eq("fecha", data.fecha)
    .maybeSingle();

  if (diaCerrado) {
    return { ok: false, error: "dia_cerrado", field: "fecha" };
  }

  const { data: franjaBloqueada } = await supabase
    .from("franjas_bloqueadas")
    .select("id")
    .eq("fecha", data.fecha)
    .eq("hora", data.hora + ":00")
    .maybeSingle();

  if (franjaBloqueada) {
    return { ok: false, error: "franja_bloqueada", field: "hora" };
  }

  if (data.fecha === todayStr) {
    const now = nowBarcelona();
    const [hh, mm] = data.hora.split(":").map(Number);
    const slotMinutes = hh * 60 + mm;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (slotMinutes - nowMinutes < 15) {
      return { ok: false, error: "franja_bloqueada", field: "hora" };
    }
  }

  const esPendiente = data.personas > limiteGrupo;

  if (!esPendiente && topeActivo) {
    const { data: ocupadas } = (await supabase
      .from("reservas")
      .select("personas")
      .eq("fecha", data.fecha)
      .eq("hora", data.hora + ":00")
      .in("estado", ["confirmada", "llegado"])) as {
      data: Pick<Reserva, "personas">[] | null;
    };

    const total = (ocupadas ?? []).reduce((s, r) => s + r.personas, 0);
    if (total + data.personas > topePersonas) {
      return { ok: false, error: "franja_bloqueada", field: "hora" };
    }
  }

  const id = randomUUID();
  const cancelToken = randomUUID();

  const { error } = await supabase
    .from("reservas")
    .insert({
      id,
      cancel_token: cancelToken,
      nombre: data.nombre.trim(),
      apellido: data.apellido.trim(),
      telefono: data.telefono,
      email: data.email.toLowerCase(),
      fecha: data.fecha,
      hora: data.hora + ":00",
      personas: data.personas,
      estado: esPendiente ? "pendiente_aprobacion" : "confirmada",
      notas_cliente: data.notas_cliente || null,
      idioma: data.idioma,
    });

  if (error) {
    console.error("Error inserting reserva:", JSON.stringify(error));
    return { ok: false, error: "generic" };
  }

  const emailData = {
    nombre: data.nombre.trim(),
    apellido: data.apellido.trim(),
    email: data.email.toLowerCase(),
    fecha: data.fecha,
    hora: data.hora + ":00",
    personas: data.personas,
    cancel_token: cancelToken,
    idioma: data.idioma,
  };

  // Enviar email con manejo de error mejorado
  let emailSent = false;
  try {
    if (esPendiente) {
      await sendPendingEmail(emailData);
    } else {
      await sendConfirmationEmail(emailData);
    }
    emailSent = true;
  } catch (err) {
    console.error("[EMAIL_FAILED] Reserva creada pero email no enviado:", {
      reservaId: id,
      email: emailData.email,
      error: err,
    });
    // Actualizar reserva con nota de fallo (para retry manual)
    try {
      const serviceClient = createServiceClient();
      await serviceClient
        .from("reservas")
        .update({ notas_internas: "[EMAIL_PENDIENTE] Email no enviado automáticamente." })
        .eq("id", id);
    } catch {
      // No bloquear si esto también falla
    }
  }

  return { ok: true, id, estado: esPendiente ? "pendiente_aprobacion" : "confirmada", emailSent };
}

export async function updateEstadoReserva(
  id: string,
  estado: Reserva["estado"]
): Promise<{ ok: boolean; error?: string }> {
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("reservas")
    .update({ estado })
    .eq("id", id);

  if (error) {
    console.error("Error updating estado:", error);
    return { ok: false, error: String(error) };
  }

  return { ok: true };
}

export async function updateNotasInternas(
  id: string,
  notas: string
): Promise<{ ok: boolean; error?: string }> {
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("reservas")
    .update({ notas_internas: notas || null })
    .eq("id", id);

  if (error) {
    return { ok: false, error: String(error) };
  }

  return { ok: true };
}

export async function cancelarPorToken(token: string): Promise<{
  ok: boolean;
  error?: string;
  reserva?: {
    nombre: string;
    email: string;
    fecha: string;
    hora: string;
    personas: number;
    idioma: string;
    cancel_token: string;
    apellido: string;
  };
}> {
  const supabase = createClient();

  const { data, error } = (await supabase.rpc("cancelar_reserva", {
    p_token: token,
  })) as { data: CancelarReservaResult | null; error: unknown };

  if (error || !data) {
    return { ok: false, error: "generic" };
  }

  if (!data.success) {
    return { ok: false, error: data.error ?? "generic" };
  }

  const reservaData = {
    nombre: data.nombre!,
    apellido: data.apellido!,
    email: data.email!,
    fecha: data.fecha!,
    hora: data.hora!,
    personas: data.personas!,
    idioma: data.idioma!,
    cancel_token: token,
  };

  sendCancellationEmail(reservaData).catch(console.error);

  return { ok: true, reserva: reservaData };
}
