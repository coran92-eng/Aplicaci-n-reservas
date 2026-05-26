import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { todayBarcelona } from "@/lib/utils";
import { FloorMap } from "@/components/admin/FloorMap";
import Link from "next/link";
import type { Mesa } from "@/actions/mesas";

export const dynamic = "force-dynamic";

interface ReservaMapa {
  id: string;
  nombre: string;
  apellido: string;
  hora: string;
  personas: number;
  estado: string;
  mesa_id: string | null;
  telefono: string | null;
}

interface PageProps {
  searchParams: { fecha?: string };
}

export default async function MapaPage({ searchParams }: PageProps) {
  await requireAdmin();

  const selectedDate = searchParams.fecha ?? todayBarcelona();
  const supabase = createServiceClient();

  const [{ data: mesasData }, { data: reservasData }] = await Promise.all([
    supabase
      .from("mesas")
      .select("id, nombre, capacidad, pos_x, pos_y, forma, activa")
      .eq("activa", true)
      .order("nombre", { ascending: true }),
    supabase
      .from("reservas")
      .select("id, nombre, apellido, hora, personas, estado, mesa_id, telefono")
      .eq("fecha", selectedDate)
      .in("estado", ["confirmada", "llegado", "pendiente_aprobacion"])
      .order("hora", { ascending: true }),
  ]);

  const mesas = (mesasData ?? []) as Mesa[];
  const reservas = (reservasData ?? []) as ReservaMapa[];

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
          >
            ← Volver al admin
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Mapa de sala</h1>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="fecha-picker" className="text-sm text-gray-500">
            Fecha:
          </label>
          <form>
            <input
              id="fecha-picker"
              type="date"
              name="fecha"
              defaultValue={selectedDate}
              onChange={undefined}
              className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
              onInput={
                // Auto-submit on change via client script
                undefined
              }
            />
            {/* Auto-submit via hidden submit triggered by date change */}
            <noscript>
              <button type="submit" className="ml-2 text-sm px-2 py-1 border rounded">
                Ir
              </button>
            </noscript>
          </form>
          <DateChangeSubmitter />
        </div>
      </div>

      {/* Floor map */}
      <div className="flex-1">
        <FloorMap mesas={mesas} reservas={reservas} fecha={selectedDate} />
      </div>
    </div>
  );
}

// Small client component to handle date input auto-submit
function DateChangeSubmitter() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            if (typeof document !== 'undefined') {
              document.addEventListener('DOMContentLoaded', function() {
                var el = document.getElementById('fecha-picker');
                if (el) {
                  el.addEventListener('change', function() {
                    var url = new URL(window.location.href);
                    url.searchParams.set('fecha', el.value);
                    window.location.href = url.toString();
                  });
                }
              });
            }
          })();
        `,
      }}
    />
  );
}
