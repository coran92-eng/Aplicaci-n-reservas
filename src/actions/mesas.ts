"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createServiceClient } from "@/lib/supabase/server";

export interface Mesa {
  id: string;
  nombre: string;
  capacidad: number;
  pos_x: number;
  pos_y: number;
  forma: "rect" | "round";
  activa: boolean;
}

export async function getMesas(): Promise<Mesa[]> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("mesas")
    .select("id, nombre, capacidad, pos_x, pos_y, forma, activa")
    .eq("activa", true)
    .order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Mesa[];
}

export async function createMesa(data: {
  nombre: string;
  capacidad: number;
  forma: "rect" | "round";
}): Promise<{ ok: boolean; id?: string }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { data: inserted, error } = await supabase
    .from("mesas")
    .insert({
      nombre: data.nombre,
      capacidad: data.capacidad,
      forma: data.forma,
      pos_x: 10,
      pos_y: 10,
      activa: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false };
  return { ok: true, id: inserted.id };
}

export async function updateMesaPosition(
  id: string,
  pos_x: number,
  pos_y: number
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("mesas")
    .update({ pos_x, pos_y })
    .eq("id", id);
  if (error) return { ok: false };
  return { ok: true };
}

export async function updateMesa(
  id: string,
  data: {
    nombre?: string;
    capacidad?: number;
    forma?: "rect" | "round";
    activa?: boolean;
  }
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from("mesas").update(data).eq("id", id);
  if (error) return { ok: false };
  return { ok: true };
}

export async function deleteMesa(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("mesas")
    .update({ activa: false })
    .eq("id", id);
  if (error) return { ok: false };
  return { ok: true };
}

export async function assignMesa(
  reservaId: string,
  mesaId: string | null
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("reservas")
    .update({ mesa_id: mesaId })
    .eq("id", reservaId);
  if (error) return { ok: false };
  return { ok: true };
}
