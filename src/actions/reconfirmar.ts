"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

const LOCALES = ["es", "ca", "en"];

export async function confirmarAsistencia(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const rawLocale = String(formData.get("locale") ?? "es");
  const locale = LOCALES.includes(rawLocale) ? rawLocale : "es";

  if (!token) redirect(`/${locale}`);

  const sc = createServiceClient();
  const { data } = await sc
    .from("reservas")
    .select("id, estado")
    .eq("reconfirmacion_token", token)
    .maybeSingle();

  if (!data || data.estado === "cancelada" || data.estado === "rechazada") {
    redirect(`/${locale}/reconfirmar?t=${encodeURIComponent(token)}`);
  }

  await sc.from("reservas").update({ reconfirmado: true }).eq("id", data.id);
  redirect(`/${locale}/reconfirmado`);
}
