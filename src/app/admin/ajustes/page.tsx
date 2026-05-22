import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { todayBarcelona } from "@/lib/utils";
import { AjustesConfig } from "@/components/admin/AjustesConfig";
import { AjustesDias } from "@/components/admin/AjustesDias";
import { AjustesFranjas } from "@/components/admin/AjustesFranjas";
import { AjustesCierreRapido } from "@/components/admin/AjustesCierreRapido";
import type { DiaCerrado, FranjaBloqueada, Configuracion } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const supabase = createServiceClient();
  const today = todayBarcelona();

  const [configRes, diasRes, franjasRes] = await Promise.all([
    supabase.from("configuracion").select("clave, valor"),
    supabase.from("dias_cerrados").select("*").gte("fecha", today).order("fecha"),
    supabase
      .from("franjas_bloqueadas")
      .select("*")
      .gte("fecha", today)
      .order("fecha")
      .order("hora"),
  ]);

  const configRows = (configRes.data ?? []) as Configuracion[];
  const config: Record<string, unknown> = {};
  for (const row of configRows) config[row.clave] = row.valor;

  const dias = (diasRes.data ?? []) as DiaCerrado[];
  const franjas = (franjasRes.data ?? []) as FranjaBloqueada[];

  const limiteGrupo = (config.limite_grupo_online as number) ?? 7;
  const antelacionMax = (config.antelacion_maxima_dias as number) ?? 90;
  const topeActivo = Boolean(config.tope_por_franja_activo);
  const topePersonas = (config.tope_por_franja_personas as number) ?? 30;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
      {/* Back */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver al panel
      </Link>

      <h1 className="text-xl font-bold text-gray-900">Ajustes</h1>

      {/* Cierre de emergencia — at top for quick access */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Emergencia
        </h2>
        <AjustesCierreRapido />
      </section>

      {/* Config */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Configuración de reservas
          </h2>
        </div>
        <AjustesConfig
          limiteGrupo={limiteGrupo}
          antelacionMax={antelacionMax}
          topeActivo={topeActivo}
          topePersonas={topePersonas}
        />
      </section>

      {/* Días cerrados */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Días cerrados
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            El restaurante no acepta reservas en estas fechas
          </p>
        </div>
        <AjustesDias initial={dias} />
      </section>

      {/* Franjas bloqueadas */}
      <section className="space-y-3 pb-8">
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Franjas bloqueadas
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Franjas horarias específicas no disponibles para reservas
          </p>
        </div>
        <AjustesFranjas initial={franjas} />
      </section>
    </div>
  );
}
