"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { revalidatePath } from "next/cache";
import { generateTimeSlots } from "@/lib/utils";

// ── Configuración ──────────────────────────────────────────────

export async function updateConfiguracion(
  clave: string,
  valor: unknown
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("configuracion")
    .update({ valor })
    .eq("clave", clave);
  if (error) return { ok: false };
  revalidatePath("/admin/ajustes");
  return { ok: true };
}

// ── Días cerrados ──────────────────────────────────────────────

export async function addDiaCerrado(
  fecha: string,
  motivo?: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("dias_cerrados")
    .insert({ fecha, motivo: motivo || null });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    return { ok: false, error: String(error) };
  }
  revalidatePath("/admin/ajustes");
  return { ok: true };
}

export async function removeDiaCerrado(
  id: string
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("dias_cerrados")
    .delete()
    .eq("id", id);
  if (error) return { ok: false };
  revalidatePath("/admin/ajustes");
  return { ok: true };
}

// ── Franjas bloqueadas ──────────────────────────────────────────

export async function addFranjaBloqueada(
  fecha: string,
  hora: string,
  motivo?: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const horaFull = hora.length === 5 ? hora + ":00" : hora;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("franjas_bloqueadas")
    .insert({ fecha, hora: horaFull, motivo: motivo || null });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicate" };
    return { ok: false, error: String(error) };
  }
  revalidatePath("/admin/ajustes");
  return { ok: true };
}

export async function removeFranjaBloqueada(
  id: string
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("franjas_bloqueadas")
    .delete()
    .eq("id", id);
  if (error) return { ok: false };
  revalidatePath("/admin/ajustes");
  return { ok: true };
}

// ── Cierre rápido ──────────────────────────────────────────────

export async function cierreRapido(
  fecha: string
): Promise<{ ok: boolean; count: number; error?: string }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const allSlots = generateTimeSlots();

  const { data: existing } = await supabase
    .from("franjas_bloqueadas")
    .select("hora")
    .eq("fecha", fecha);

  const existingHoras = new Set(
    (existing ?? []).map((f) => f.hora.slice(0, 5))
  );
  const newSlots = allSlots.filter((s) => !existingHoras.has(s));

  if (newSlots.length === 0) return { ok: true, count: 0 };

  const rows = newSlots.map((hora) => ({
    fecha,
    hora: hora + ":00",
    motivo: "Cierre rápido",
  }));

  const { error } = await supabase.from("franjas_bloqueadas").insert(rows);
  if (error) return { ok: false, count: 0, error: String(error) };

  revalidatePath("/admin/ajustes");
  return { ok: true, count: newSlots.length };
}

export async function reaperturaRapida(
  fecha: string
): Promise<{ ok: boolean; count: number }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("franjas_bloqueadas")
    .delete()
    .eq("fecha", fecha)
    .eq("motivo", "Cierre rápido")
    .select("id");
  if (error) return { ok: false, count: 0 };
  revalidatePath("/admin/ajustes");
  return { ok: true, count: (data ?? []).length };
}
