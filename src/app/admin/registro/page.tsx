import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import type { Reserva } from "@/lib/supabase/types";
import { countryFromPhone } from "@/lib/phone-country";
import { formatTime, todayBarcelona, addDaysToDate } from "@/lib/utils";
import { computeStats } from "@/lib/registro-stats";
import { RegistroStats } from "@/components/admin/RegistroStats";
import Link from "next/link";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const STATUS: Record<string, { label: string; className: string }> = {
  confirmada: { label: "Confirmada", className: "bg-green-100 text-green-700" },
  llegado: { label: "Ha llegado", className: "bg-blue-100 text-blue-700" },
  no_show: { label: "No show", className: "bg-gray-200 text-gray-600" },
  cancelada: { label: "Cancelada", className: "bg-red-100 text-red-700" },
  pendiente_aprobacion: { label: "Pendiente", className: "bg-amber-100 text-amber-700" },
  rechazada: { label: "Rechazada", className: "bg-red-100 text-red-700" },
};

// created_at es un timestamptz; lo mostramos en hora de Barcelona
function formatMadeOn(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// fecha es un 'date' (YYYY-MM-DD) sin zona; lo formateamos localmente
function formatBookedFor(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  await requireAdmin();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createServiceClient();

  // Ventana para estadísticas: semana pasada + esta semana + próximos 7 días (por día de servicio)
  const today = todayBarcelona();
  const statsFrom = addDaysToDate(today, -14);
  const statsTo = addDaysToDate(today, 7);

  const [{ data, count }, { data: statsData }] = await Promise.all([
    supabase
      .from("reservas")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("reservas")
      .select("*")
      .gte("fecha", statsFrom)
      .lte("fecha", statsTo),
  ]);

  const reservas = (data ?? []) as Reserva[];
  const stats = computeStats((statsData ?? []) as Reserva[], today);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Registro de reservas</h1>
          <span className="text-sm text-gray-500 shrink-0">{total} en total</span>
        </div>
        {total > 0 && (
          <a
            href="/admin/registro/export"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors shrink-0"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </a>
        )}
      </div>

      <RegistroStats stats={stats} />

      {reservas.length === 0 ? (
        <p className="text-sm text-gray-400 mt-8 text-center">
          No hay reservas registradas todavía.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Hecha el</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">Para el día</th>
                <th className="px-3 py-2.5 font-medium text-center">Pers.</th>
                <th className="px-3 py-2.5 font-medium whitespace-nowrap">País</th>
                <th className="px-3 py-2.5 font-medium">Cliente</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reservas.map((r) => {
                const pais = countryFromPhone(r.telefono);
                const estado = STATUS[r.estado] ?? {
                  label: r.estado,
                  className: "bg-gray-100 text-gray-600",
                };
                return (
                  <tr key={r.id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                      {formatMadeOn(r.created_at)}
                    </td>
                    <td className="px-3 py-2.5 text-gray-900 whitespace-nowrap capitalize">
                      {formatBookedFor(r.fecha)}
                      <span className="text-gray-400"> · {formatTime(r.hora)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium text-gray-900">
                      {r.personas}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {pais ? (
                        <span title={`${pais.name} (${r.telefono})`}>
                          <span className="mr-1">{pais.flag}</span>
                          <span className="text-gray-700">{pais.name}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300" title={r.telefono}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-900">
                      {r.nombre} {r.apellido}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${estado.className}`}>
                        {estado.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <PageLink page={page - 1} disabled={page <= 1} label="← Anteriores" />
          <span className="text-xs text-gray-400">
            Página {page} de {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages} label="Siguientes →" />
        </div>
      )}
    </div>
  );
}

function PageLink({ page, disabled, label }: { page: number; disabled: boolean; label: string }) {
  if (disabled) {
    return <span className="text-sm text-gray-300 px-3 py-2">{label}</span>;
  }
  return (
    <Link
      href={`/admin/registro?page=${page}`}
      className="text-sm text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
    >
      {label}
    </Link>
  );
}
