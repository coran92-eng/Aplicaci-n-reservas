"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { reservaSchema } from "@/lib/validations";
import {
  sendConfirmationEmail,
  sendPendingEmail,
  sendCancellationEmail,
  sendRejectionEmail,
  sendAdminNotification,
} from "@/lib/emails";
import { requireAdmin } from "@/lib/require-admin";
import { todayBarcelona, nowBarcelona, generateTimeSlots } from "@/lib/utils";
import { headers } from "next/headers";
import type {
  Reserva,
  Configuracion,
  CancelarReservaResult,
} from "@/lib/supabase/types";

// Rate limiter basado en Supabase (funciona en entornos serverless como Vercel)
async function checkRateLimit(ip: string): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return true; // fail open si no está configurada
  try {
    const serviceClient = createServiceClient();
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count, error } = await serviceClient
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("identifier", ip)
      .eq("action", "create_reserva")
      .gte("created_at", windowStart);

    if (error) return true;
    if ((count ?? 0) >= 3) return false;

    await serviceClient.from("rate_limits").insert({
      identifier: ip,
      action: "create_reserva",
    });

    return true;
  } catch {
    return true; // fail open
  }
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
  | { ok: true; id: string; estado: string; cancelToken: string; emailSent?: boolean; emailError?: string }
  | { ok: false; error: string; field?: string; dbError?: string };

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
    return { ok: true, id: "honeypot", estado: "confirmada", cancelToken: "honeypot" };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Missing Supabase env vars");
    return { ok: false, error: "generic", dbError: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" };
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
  // Token expires 7 days after the reservation date
  const [fy, fm, fd] = data.fecha.split("-").map(Number);
  const tokenExpiry = new Date(Date.UTC(fy, fm - 1, fd + 7)).toISOString();

  const { error } = await supabase
    .from("reservas")
    .insert({
      id,
      cancel_token: cancelToken,
      cancel_token_expires_at: tokenExpiry,
      nombre: data.nombre.trim(),
      apellido: data.apellido.trim(),
      telefono: data.telefono,
      email: data.email.toLowerCase(),
      fecha: data.fecha,
      hora: data.hora + ":00",
      personas: data.personas,
      estado: esPendiente ? "pendiente_aprobacion" : "confirmada",
      notas_cliente: data.notas_cliente || null,
      alergias: data.alergias ?? [],
      idioma: data.idioma,
    });

  if (error) {
    console.error("Error inserting reserva:", JSON.stringify(error));
    const dbError = process.env.NODE_ENV !== "production" ? `${error.code}: ${error.message}` : undefined;
    return { ok: false, error: "generic", dbError };
  }

  // Upsert cliente (fire-and-forget, no bloquea la respuesta al usuario)
  try {
    const sc = createServiceClient();
    const { data: cliente } = await sc
      .from("clientes")
      .upsert(
        { email: data.email.toLowerCase(), nombre: data.nombre.trim(), apellido: data.apellido.trim(), telefono: data.telefono },
        { onConflict: "email" }
      )
      .select("id")
      .single();
    if (cliente?.id) {
      await sc.from("reservas").update({ cliente_id: cliente.id }).eq("id", id);
    }
  } catch {
    // Non-fatal: cliente upsert can fail gracefully before migration
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

  if (esPendiente) {
    sendAdminNotification({
      tipo: "nueva_pendiente",
      nombre: emailData.nombre,
      apellido: emailData.apellido,
      fecha: emailData.fecha,
      hora: emailData.hora,
      personas: emailData.personas,
      telefono: data.telefono,
      email: emailData.email,
    }).catch(console.error);
  }

  // Enviar email con manejo de error mejorado
  let emailSent = false;
  let emailError: string | undefined;
  try {
    if (esPendiente) {
      await sendPendingEmail(emailData);
    } else {
      await sendConfirmationEmail(emailData);
    }
    emailSent = true;
  } catch (err) {
    const errObj = err as { message?: string; name?: string; statusCode?: number };
    emailError = `${errObj.name ?? "Error"} ${errObj.statusCode ?? ""}: ${errObj.message ?? String(err)}`.trim();
    console.error("[EMAIL_FAILED] Reserva creada pero email no enviado:", {
      reservaId: id,
      email: emailData.email,
      error: err,
    });
    try {
      const serviceClient = createServiceClient();
      await serviceClient
        .from("reservas")
        .update({ notas_internas: `[EMAIL_PENDIENTE] ${emailError}` })
        .eq("id", id);
    } catch {
      // No bloquear si esto también falla
    }
  }

  return { ok: true, id, estado: esPendiente ? "pendiente_aprobacion" : "confirmada", cancelToken, emailSent, emailError };
}

export async function updateReserva(
  id: string,
  updates: {
    nombre?: string;
    apellido?: string;
    telefono?: string;
    email?: string;
    fecha?: string;
    hora?: string;
    personas?: number;
    notas_cliente?: string | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const serviceClient = createServiceClient();

  if (updates.fecha !== undefined || updates.hora !== undefined) {
    const { data: current } = await serviceClient
      .from("reservas")
      .select("fecha, hora")
      .eq("id", id)
      .single();

    if (!current) return { ok: false, error: "not_found" };

    const newFecha = updates.fecha ?? current.fecha;
    const rawHora = updates.hora ?? current.hora;
    const newHora = rawHora.length === 5 ? rawHora + ":00" : rawHora;

    if (newFecha < todayBarcelona()) {
      return { ok: false, error: "fecha_past" };
    }

    const { data: diaCerrado } = await serviceClient
      .from("dias_cerrados")
      .select("id")
      .eq("fecha", newFecha)
      .maybeSingle();
    if (diaCerrado) return { ok: false, error: "dia_cerrado" };

    const { data: franjaBloqueada } = await serviceClient
      .from("franjas_bloqueadas")
      .select("id")
      .eq("fecha", newFecha)
      .eq("hora", newHora)
      .maybeSingle();
    if (franjaBloqueada) return { ok: false, error: "franja_bloqueada" };
  }

  const payload: Record<string, unknown> = { ...updates };
  if (updates.hora) {
    payload.hora = updates.hora.length === 5 ? updates.hora + ":00" : updates.hora;
  }
  const { error } = await serviceClient.from("reservas").update(payload).eq("id", id);
  if (error) {
    console.error("Error updating reserva:", error);
    return { ok: false, error: String(error) };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function updateEstadoReserva(
  id: string,
  estado: Reserva["estado"]
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const serviceClient = createServiceClient();

  const { error } = await serviceClient
    .from("reservas")
    .update({ estado })
    .eq("id", id)
    .neq("estado", "cancelada")
    .neq("estado", "rechazada");

  if (error) {
    console.error("Error updating estado:", error);
    return { ok: false, error: String(error) };
  }

  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function updateNotasInternas(
  id: string,
  notas: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
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
  sendAdminNotification({
    tipo: "cancelacion",
    nombre: reservaData.nombre,
    apellido: reservaData.apellido,
    fecha: reservaData.fecha,
    hora: reservaData.hora,
    personas: reservaData.personas,
    email: reservaData.email,
  }).catch(console.error);

  return { ok: true, reserva: reservaData };
}

export async function approveReserva(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const serviceClient = createServiceClient();

  const { data: reserva, error: fetchError } = await serviceClient
    .from("reservas")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !reserva) return { ok: false, error: "not_found" };

  const { error } = await serviceClient
    .from("reservas")
    .update({ estado: "confirmada" })
    .eq("id", id);

  if (error) return { ok: false, error: String(error) };

  try {
    await sendConfirmationEmail({
      nombre: reserva.nombre,
      apellido: reserva.apellido,
      email: reserva.email,
      fecha: reserva.fecha,
      hora: reserva.hora,
      personas: reserva.personas,
      cancel_token: reserva.cancel_token,
      idioma: reserva.idioma,
    });
  } catch (err) {
    console.error("[EMAIL_FAILED] Approve email failed:", err);
  }

  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function rejectReserva(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const serviceClient = createServiceClient();

  const { data: reserva, error: fetchError } = await serviceClient
    .from("reservas")
    .select("nombre,apellido,email,fecha,hora,personas,idioma")
    .eq("id", id)
    .single();

  if (fetchError || !reserva) return { ok: false, error: "not_found" };

  const { error } = await serviceClient
    .from("reservas")
    .update({ estado: "rechazada" })
    .eq("id", id);

  if (error) return { ok: false, error: String(error) };

  sendRejectionEmail({
    nombre: reserva.nombre,
    apellido: reserva.apellido,
    email: reserva.email,
    fecha: reserva.fecha,
    hora: reserva.hora,
    personas: reserva.personas,
    idioma: reserva.idioma,
  }).catch((err) => console.error("[EMAIL_FAILED] Rejection email failed:", err));

  revalidatePath("/admin", "layout");
  return { ok: true };
}

export type CreateWalkinResult = { ok: true; id: string } | { ok: false; error: string };

export async function createWalkin(data: {
  nombre: string;
  apellido: string;
  personas: number;
  fecha: string;
  hora: string;
  telefono: string;
  email?: string;
  notas_cliente?: string;
}): Promise<CreateWalkinResult> {
  await requireAdmin();
  const serviceClient = createServiceClient();
  const id = randomUUID();
  const cancelToken = randomUUID();
  const [wfy, wfm, wfd] = data.fecha.split("-").map(Number);
  const walkinTokenExpiry = new Date(Date.UTC(wfy, wfm - 1, wfd + 7)).toISOString();

  const { error } = await serviceClient.from("reservas").insert({
    id,
    cancel_token: cancelToken,
    cancel_token_expires_at: walkinTokenExpiry,
    nombre: data.nombre.trim(),
    apellido: data.apellido.trim(),
    telefono: data.telefono.trim(),
    email: data.email?.trim().toLowerCase() || `walkin-${id}@internal.local`,
    fecha: data.fecha,
    hora: data.hora.length === 5 ? data.hora + ":00" : data.hora,
    personas: data.personas,
    estado: "llegado" as const,
    notas_cliente: data.notas_cliente || null,
    idioma: "es" as const,
  });

  if (error) {
    console.error("Error creating walkin:", error);
    return { ok: false, error: String(error) };
  }

  // Upsert cliente si hay email real
  if (data.email) {
    try {
      const { data: cliente } = await serviceClient
        .from("clientes")
        .upsert(
          { email: data.email.trim().toLowerCase(), nombre: data.nombre.trim(), apellido: data.apellido.trim(), telefono: data.telefono.trim() },
          { onConflict: "email" }
        )
        .select("id")
        .single();
      if (cliente?.id) {
        await serviceClient.from("reservas").update({ cliente_id: cliente.id }).eq("id", id);
      }
    } catch { /* non-fatal */ }
  }

  revalidatePath("/admin", "layout");
  return { ok: true, id };
}

export async function getPendingCount(): Promise<number> {
  await requireAdmin();
  const serviceClient = createServiceClient();
  const { count } = await serviceClient
    .from("reservas")
    .select("id", { count: "exact", head: true })
    .eq("estado", "pendiente_aprobacion");
  return count ?? 0;
}

export type ModificarReservaResult = { ok: true; newToken: string; reservaId: string } | { ok: false; error: string };

export async function modificarReserva(
  token: string,
  updates: { fecha: string; hora: string }
): Promise<ModificarReservaResult> {
  const serviceClient = createServiceClient();

  const { data: reserva } = await serviceClient
    .from("reservas")
    .select("*")
    .eq("cancel_token", token)
    .single();

  if (!reserva) return { ok: false, error: "not_found" };
  if (reserva.estado === "cancelada" || reserva.estado === "rechazada") {
    return { ok: false, error: "cannot_modify" };
  }
  if (reserva.cancel_token_expires_at && new Date(reserva.cancel_token_expires_at) < new Date()) {
    return { ok: false, error: "token_expired" };
  }

  const today = todayBarcelona();
  if (updates.fecha < today) return { ok: false, error: "fecha_past" };

  const { data: diaCerrado } = await serviceClient
    .from("dias_cerrados")
    .select("id")
    .eq("fecha", updates.fecha)
    .maybeSingle();
  if (diaCerrado) return { ok: false, error: "dia_cerrado" };

  const { data: franja } = await serviceClient
    .from("franjas_bloqueadas")
    .select("id")
    .eq("fecha", updates.fecha)
    .eq("hora", updates.hora.length === 5 ? updates.hora + ":00" : updates.hora)
    .maybeSingle();
  if (franja) return { ok: false, error: "franja_bloqueada" };

  const hora = updates.hora.length === 5 ? updates.hora + ":00" : updates.hora;
  const newToken = randomUUID();
  const [fy, fm, fd] = updates.fecha.split("-").map(Number);
  const newExpiry = new Date(Date.UTC(fy, fm - 1, fd + 7)).toISOString();

  const { error } = await serviceClient
    .from("reservas")
    .update({ fecha: updates.fecha, hora, cancel_token: newToken, cancel_token_expires_at: newExpiry })
    .eq("cancel_token", token);

  if (error) return { ok: false, error: "generic" };

  sendConfirmationEmail({
    nombre: reserva.nombre,
    apellido: reserva.apellido,
    email: reserva.email,
    fecha: updates.fecha,
    hora,
    personas: reserva.personas,
    cancel_token: newToken,
    idioma: reserva.idioma,
  }).catch(console.error);

  return { ok: true, newToken, reservaId: reserva.id };
}

// Returns total confirmed persons per date for a date range (for availability dots)
export async function getMonthOccupancy(
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from("reservas")
    .select("fecha, personas")
    .gte("fecha", startDate)
    .lte("fecha", endDate)
    .in("estado", ["confirmada", "llegado"]);

  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    result[row.fecha] = (result[row.fecha] ?? 0) + (row as { fecha: string; personas: number }).personas;
  }
  return result;
}

export async function getAvailableSlots(
  fecha: string,
  personas: number
): Promise<string[]> {
  const serviceClient = createServiceClient();

  const [{ data: configRows }, { data: bloqueadas }, { data: ocupadas }] =
    await Promise.all([
      serviceClient.from("configuracion").select("clave, valor"),
      serviceClient.from("franjas_bloqueadas").select("hora").eq("fecha", fecha),
      serviceClient
        .from("reservas")
        .select("hora, personas")
        .eq("fecha", fecha)
        .in("estado", ["confirmada", "llegado"]),
    ]);

  const config: Record<string, unknown> = {};
  for (const row of configRows ?? []) config[row.clave] = row.valor;
  const topeActivo = Boolean(config.tope_por_franja_activo);
  const topePersonas = (config.tope_por_franja_personas as number) ?? 30;

  const blocked = new Set((bloqueadas ?? []).map((f: { hora: string }) => f.hora.slice(0, 5)));
  const occupancy: Record<string, number> = {};
  for (const r of ocupadas ?? []) {
    const key = (r as { hora: string; personas: number }).hora.slice(0, 5);
    occupancy[key] = (occupancy[key] ?? 0) + (r as { hora: string; personas: number }).personas;
  }

  const today = todayBarcelona();
  const now = nowBarcelona();
  const nowMins = fecha === today ? now.getHours() * 60 + now.getMinutes() : -1;

  return generateTimeSlots().filter((slot) => {
    if (blocked.has(slot)) return false;
    const [hh, mm] = slot.split(":").map(Number);
    if (nowMins >= 0 && hh !== 0 && hh * 60 + mm - nowMins < 15) return false;
    if (topeActivo) {
      const used = occupancy[slot] ?? 0;
      if (used + personas > topePersonas) return false;
    }
    return true;
  });
}
