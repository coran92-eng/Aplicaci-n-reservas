import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Ruta heredada de los emails ya enviados. No modifica nada (los escáneres de
// correo abren los links): redirige a la página que pide un clic explícito.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  if (!token) return NextResponse.redirect(new URL("/es", req.url));

  const sc = createServiceClient();
  const { data } = await sc
    .from("reservas")
    .select("idioma")
    .eq("reconfirmacion_token", token)
    .maybeSingle();

  const locale = data?.idioma && ["es", "ca", "en"].includes(data.idioma) ? data.idioma : "es";
  return NextResponse.redirect(
    new URL(`/${locale}/reconfirmar?t=${encodeURIComponent(token)}`, req.url)
  );
}
