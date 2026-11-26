import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ReservationForm } from "@/components/forms/ReservationForm";
import { Shell } from "@/components/site/Shell";
import type { FranjaBloqueada, DiaCerrado, Configuracion } from "@/lib/supabase/types";
import { todayBarcelona, addDaysToDate } from "@/lib/utils";

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations("form");
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
  for (const row of configRows) {
    config[row.clave] = row.valor;
  }

  const limiteGrupo = (config.limite_grupo_online as number) ?? 11;
  const antelacionMax = (config.antelacion_maxima_dias as number) ?? 90;
  const topePersonas = (config.tope_por_franja_personas as number) ?? 30;

  // Build day-level occupancy: max persons across all slots in a day
  const dayOccupancy: Record<string, number> = {};
  for (const row of occ ?? []) {
    const r = row as { fecha: string; personas: number };
    dayOccupancy[r.fecha] = (dayOccupancy[r.fecha] ?? 0) + r.personas;
  }

  return (
    <Shell>
      <div className="cdm-col">
        <div className="cdm-h">
          <h1>{t("title")}</h1>
        </div>
        <p className="cdm-sub">{t("subtitle")}</p>
        <div className="cdm-sign">
          <ReservationForm
            franjasBloqueadas={franjasBloqueadas}
            diasCerrados={diasCerrados}
            limiteGrupo={limiteGrupo}
            antelacionMax={antelacionMax}
            topePersonas={topePersonas}
            dayOccupancy={dayOccupancy}
          />
        </div>
      </div>
    </Shell>
  );
}
