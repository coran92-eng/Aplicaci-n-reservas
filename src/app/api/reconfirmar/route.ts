import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  if (!token) return NextResponse.redirect(new URL("/es", req.url));

  const sc = createServiceClient();
  const { data } = await sc
    .from("reservas")
    .select("id, reconfirmado, estado")
    .eq("reconfirmacion_token", token)
    .single();

  if (!data || data.estado === "cancelada" || data.estado === "rechazada") {
    return NextResponse.redirect(new URL("/es/not-found", req.url));
  }

  if (!data.reconfirmado) {
    await sc
      .from("reservas")
      .update({ reconfirmado: true })
      .eq("reconfirmacion_token", token);
  }

  return NextResponse.redirect(new URL("/es/reconfirmado", req.url));
}
