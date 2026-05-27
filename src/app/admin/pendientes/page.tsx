import { createServiceClient } from "@/lib/supabase/server";
import type { Reserva } from "@/lib/supabase/types";
import { PendientesList } from "@/components/admin/PendientesList";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "short", day: "numeric", month: "short",
  });
}

export default async function PendientesPage() {
  let reservas: Reserva[] = [];
  let dbError: string | null = null;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("reservas")
      .select("*")
      .eq("estado", "pendiente_aprobacion")
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });
    if (error) {
      dbError = error.message;
    } else {
      reservas = (data ?? []) as Reserva[];
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  if (dbError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Pendientes de aprobación</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-2">
          <p className="text-sm font-semibold text-red-700">Error al cargar los datos</p>
          <p className="text-xs font-mono text-red-600 break-all">{dbError}</p>
          <p className="text-xs text-red-500 mt-2">
            Comprueba que las variables <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> y <code>ADMIN_MAGIC_LINK_SECRET</code>{" "}
            están configuradas en Vercel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Pendientes de aprobación</h1>
        <p className="text-sm text-gray-500 mt-1">
          {reservas.length === 0
            ? "No hay solicitudes pendientes"
            : `${reservas.length} solicitud${reservas.length !== 1 ? "es" : ""} esperando respuesta`}
        </p>
      </div>

      {reservas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Users className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-gray-500">Todo al día</p>
        </div>
      ) : (
        <PendientesList reservas={reservas} formatDate={formatDate} />
      )}
    </div>
  );
}
