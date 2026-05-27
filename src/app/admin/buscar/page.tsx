import { createServiceClient } from "@/lib/supabase/server";
import type { Reserva } from "@/lib/supabase/types";
import { SearchForm } from "@/components/admin/SearchForm";
import { formatTime } from "@/lib/utils";
import Link from "next/link";
import { todayBarcelona } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatDateShort(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

const STATUS_LABEL: Record<string, string> = {
  confirmada: "Confirmada",
  llegado: "Ha llegado",
  no_show: "No show",
  cancelada: "Cancelada",
  pendiente_aprobacion: "Pendiente",
  rechazada: "Rechazada",
};

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const today = todayBarcelona();

  let reservas: Reserva[] = [];

  if (q.length >= 2) {
    const supabase = createServiceClient();
    const pattern = `%${q}%`;

    const { data } = await supabase
      .from("reservas")
      .select("*")
      .or(
        `nombre.ilike.${pattern},apellido.ilike.${pattern},email.ilike.${pattern},telefono.ilike.${pattern}`
      )
      .order("fecha", { ascending: false })
      .order("hora", { ascending: true })
      .limit(50);

    reservas = (data ?? []) as Reserva[];
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Buscar reservas</h1>

      <SearchForm initialQ={q} />

      {q.length >= 2 && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-3">
            {reservas.length === 0
              ? `Sin resultados para "${q}"`
              : `${reservas.length} resultado${reservas.length !== 1 ? "s" : ""} para "${q}"`}
          </p>

          <div className="divide-y border rounded-xl overflow-hidden">
            {reservas.map((r) => {
              const href =
                r.fecha === today ? "/admin" : `/admin/dia/${r.fecha}`;
              return (
                <Link
                  key={r.id}
                  href={href}
                  className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {r.nombre} {r.apellido}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      <span className="capitalize">{formatDateShort(r.fecha)}</span>
                      {" · "}
                      {formatTime(r.hora)}
                      {" · "}
                      {r.personas} pers.
                      {" · "}
                      {r.telefono}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {STATUS_LABEL[r.estado] ?? r.estado}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {q.length > 0 && q.length < 2 && (
        <p className="mt-4 text-sm text-gray-400">Escribe al menos 2 caracteres.</p>
      )}
    </div>
  );
}
