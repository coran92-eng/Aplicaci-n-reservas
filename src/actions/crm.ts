"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateClienteTags(
  id: string,
  tags: string[]
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("clientes")
    .update({ tags })
    .eq("id", id);
  if (error) return { ok: false };
  revalidatePath(`/admin/clientes/${id}`);
  return { ok: true };
}

export async function updateClienteNotas(
  id: string,
  notas: string
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("clientes")
    .update({ notas: notas || null })
    .eq("id", id);
  if (error) return { ok: false };
  revalidatePath(`/admin/clientes/${id}`);
  return { ok: true };
}
