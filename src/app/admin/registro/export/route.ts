import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { countryFromPhone } from "@/lib/phone-country";
import type { Reserva } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  confirmada: "Confirmada",
  llegado: "Ha llegado",
  no_show: "No show",
  cancelada: "Cancelada",
  pendiente_aprobacion: "Pendiente",
  rechazada: "Rechazada",
};

// created_at (timestamptz) → "YYYY-MM-DD HH:MM" en hora de Barcelona.
// sv-SE produce un formato ISO-like, ordenable en la hoja de cálculo.
function madeOn(iso: string): string {
  return new Date(iso).toLocaleString("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  // Entrecomillar si contiene coma, comilla, salto de línea; escapar comillas
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  await requireAdmin();
  const supabase = createServiceClient();

  // Traer todas las reservas en lotes (PostgREST limita a 1000 por consulta)
  const all: Reserva[] = [];
  const BATCH = 1000;
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await supabase
      .from("reservas")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + BATCH - 1);
    if (error) break;
    const rows = (data ?? []) as Reserva[];
    all.push(...rows);
    if (rows.length < BATCH) break;
  }

  const headers = [
    "Hecha el",
    "Para el día",
    "Hora",
    "Comensales",
    "País",
    "Código país",
    "Teléfono",
    "Nombre",
    "Apellido",
    "Email",
    "Estado",
    "Idioma",
  ];

  const lines = [headers.join(",")];
  for (const r of all) {
    const pais = countryFromPhone(r.telefono);
    const row = [
      madeOn(r.created_at),
      r.fecha,
      r.hora?.slice(0, 5) ?? "",
      r.personas,
      pais?.name ?? "",
      pais?.code ?? "",
      r.telefono,
      r.nombre,
      r.apellido,
      r.email,
      STATUS_LABEL[r.estado] ?? r.estado,
      r.idioma,
    ];
    lines.push(row.map(csvCell).join(","));
  }

  // BOM para que Excel interprete UTF-8 (acentos correctos)
  const csv = "﻿" + lines.join("\r\n");
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservas-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
