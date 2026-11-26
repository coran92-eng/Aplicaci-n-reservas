import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ReservationForm } from "@/components/forms/ReservationForm";
import { Shell } from "@/components/site/Shell";
import type { FranjaBloqueada, DiaCerrado, Configuracion } from "@/lib/supabase/types";
import { todayBarcelona, addDaysToDate } from "@/lib/utils";
import { normalizaOrigen } from "@/lib/origen";
import { MAX_PERSONAS_ONLINE } from "@/lib/validations";

type SP = Record<string, string | string[] | undefined>;

function primero(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// ?fecha=AAAA-MM-DD o ?dia=N (días desde hoy, hora de Barcelona). Solo si es una fecha real y reservable.
function fechaInicial(sp: SP, today: string, maxDate: string, cerrados: Set<string>): string | undefined {
  const f = primero(sp.fecha);
  const d = primero(sp.dia);
  let fecha: string | undefined;
  if (f && /^\d{4}-\d{2}-\d{2}$/.test(f)) {
    const real = new Date(`${f}T00:00:00Z`);
    if (!Number.isNaN(real.getTime()) && real.toISOString().slice(0, 10) === f) fecha = f;
  } else if (d && /^\d{1,2}$/.test(d)) {
    fecha = addDaysToDate(today, Number(d));
  }
  if (!fecha || fecha < today || fecha > maxDate || cerrados.has(fecha)) return undefined;
  return fecha;
}

export default async function HomePage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams?: SP;
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

  // Llegada desde la web con personas y día ya elegidos, y de dónde viene (?src=)
  const sp: SP = searchParams ?? {};
  const pRaw = Number.parseInt(primero(sp.personas) ?? "", 10);
  const initialPersonas = Number.isInteger(pRaw) && pRaw >= 1 && pRaw <= MAX_PERSONAS_ONLINE ? pRaw : undefined;
  const initialFecha = fechaInicial(
    sp,
    today,
    addDaysToDate(today, antelacionMax),
    new Set(diasCerrados.map((d) => d.fecha))
  );
  const origen = normalizaOrigen(primero(sp.src)) ?? undefined;

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
            initialPersonas={initialPersonas}
            initialFecha={initialFecha}
            origen={origen}
          />
        </div>
      </div>
    </Shell>
  );
}
