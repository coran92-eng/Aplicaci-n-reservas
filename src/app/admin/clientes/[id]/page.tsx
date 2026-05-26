import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { createServiceClient } from "@/lib/supabase/server";
import { ClienteTagEditor } from "@/components/admin/ClienteTagEditor";
import { ClienteNotasEditor } from "@/components/admin/ClienteNotasEditor";
import { cn } from "@/lib/utils";
import type { Reserva } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  confirmada:           { label: "Confirmada",  className: "bg-gray-100 text-gray-700" },
  llegado:              { label: "Ha llegado",  className: "bg-green-100 text-green-700" },
  no_show:              { label: "No show",     className: "bg-red-100 text-red-700" },
  cancelada:            { label: "Cancelada",   className: "bg-gray-100 text-gray-400" },
  pendiente_aprobacion: { label: "Pendiente",   className: "bg-amber-100 text-amber-700" },
  rechazada:            { label: "Rechazada",   className: "bg-red-100 text-red-400" },
};

export default async function ClientePerfilPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const supabase = createServiceClient();

  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !cliente) notFound();

  const { data: reservas } = await supabase
    .from("reservas")
    .select("*")
    .eq("cliente_id", params.id)
    .order("fecha", { ascending: false });

  const displayName =
    [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") || cliente.email;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <Link
        href="/admin/buscar"
        className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        ← Buscar clientes
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-1">
        <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
        <p className="text-sm text-gray-500">{cliente.email}</p>
        {cliente.telefono && (
          <p className="text-sm text-gray-500">{cliente.telefono}</p>
        )}
        <p className="text-xs text-gray-400 pt-1">
          {cliente.visitas} {cliente.visitas === 1 ? "visita" : "visitas"}
        </p>
      </div>

      {/* Tags */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Etiquetas
        </h2>
        <ClienteTagEditor
          clienteId={cliente.id}
          initialTags={cliente.tags ?? []}
        />
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Notas internas
        </h2>
        <ClienteNotasEditor
          clienteId={cliente.id}
          initialNotas={cliente.notas ?? ""}
        />
      </div>

      {/* Reservation history */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Historial de reservas
          </h2>
        </div>
        {!reservas || reservas.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">
            Sin reservas registradas
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {(reservas as Reserva[]).map((r) => {
              const status = STATUS_CONFIG[r.estado] ?? STATUS_CONFIG.confirmada;
              return (
                <div
                  key={r.id}
                  className="px-5 py-3 flex items-start justify-between gap-3 text-sm"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-medium text-gray-900">
                      {r.fecha}{" "}
                      <span className="text-gray-500 font-normal">
                        {r.hora.slice(0, 5)}
                      </span>
                    </p>
                    <p className="text-gray-500">
                      {r.personas} {r.personas === 1 ? "persona" : "personas"}
                    </p>
                    {r.notas_cliente && (
                      <p className="text-xs text-gray-400 truncate max-w-xs">
                        {r.notas_cliente}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
