import { createClient } from "@/lib/supabase/server";
import { ReservationForm } from "@/components/forms/ReservationForm";
import { EmbedHeightReporter } from "@/components/EmbedHeightReporter";
import { EmbedLocaleDetector } from "@/components/EmbedLocaleDetector";
import type { FranjaBloqueada, DiaCerrado, Configuracion } from "@/lib/supabase/types";
import { todayBarcelona, addDaysToDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function EmbedPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const supabase = createClient();

  const today = todayBarcelona();
  const endDate = addDaysToDate(today, 90);

  const [{ data: fb }, { data: dc }, { data: cr }, { data: occ }] = await Promise.all([
    supabase.from("franjas_bloqueadas").select("*"),
    supabase.from("dias_cerrados").select("*"),
    supabase.from("configuracion").select("clave, valor"),
    supabase
      .from("reservas")
      .select("fecha, personas")
      .gte("fecha", today)
      .lte("fecha", endDate)
      .in("estado", ["confirmada", "llegado"]),
  ]);

  const franjasBloqueadas = (fb ?? []) as FranjaBloqueada[];
  const diasCerrados = (dc ?? []) as DiaCerrado[];
  const configRows = (cr ?? []) as Configuracion[];

  const config: Record<string, unknown> = {};
  for (const row of configRows) config[row.clave] = row.valor;

  const limiteGrupo = (config.limite_grupo_online as number) ?? 7;
  const antelacionMax = (config.antelacion_maxima_dias as number) ?? 90;
  const topePersonas = (config.tope_por_franja_personas as number) ?? 30;

  const dayOccupancy: Record<string, number> = {};
  for (const row of occ ?? []) {
    const r = row as { fecha: string; personas: number };
    dayOccupancy[r.fecha] = (dayOccupancy[r.fecha] ?? 0) + r.personas;
  }

  return (
    <>
      <EmbedHeightReporter />
      <EmbedLocaleDetector currentLocale={locale} />
      <div className="bg-background min-h-0 p-4">
        <div className="bg-card rounded-xl border border-border p-6 max-w-lg mx-auto">
          <ReservationForm
            franjasBloqueadas={franjasBloqueadas}
            diasCerrados={diasCerrados}
            limiteGrupo={limiteGrupo}
            antelacionMax={antelacionMax}
            topePersonas={topePersonas}
            dayOccupancy={dayOccupancy}
            embed
          />
        </div>
      </div>
    </>
  );
}
