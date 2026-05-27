import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ReservationForm } from "@/components/forms/ReservationForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { FranjaBloqueada, DiaCerrado, Configuracion } from "@/lib/supabase/types";
import { todayBarcelona, addDaysToDate } from "@/lib/utils";

const RESTAURANT_PHONE = process.env.RESTAURANT_PHONE ?? "+34 623 216 562";
const RESTAURANT_ADDRESS = process.env.RESTAURANT_ADDRESS ?? "Comte d'Urgell 108, 08011 Barcelona";

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

  const limiteGrupo = (config.limite_grupo_online as number) ?? 7;
  const antelacionMax = (config.antelacion_maxima_dias as number) ?? 90;
  const topePersonas = (config.tope_por_franja_personas as number) ?? 30;

  // Build day-level occupancy: max persons across all slots in a day
  const dayOccupancy: Record<string, number> = {};
  for (const row of occ ?? []) {
    const r = row as { fecha: string; personas: number };
    dayOccupancy[r.fecha] = (dayOccupancy[r.fecha] ?? 0) + r.personas;
  }

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-[#050505] border-b border-border">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, #ebebeb 40px, #ebebeb 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, #ebebeb 40px, #ebebeb 41px)",
        }} />
        <div className="relative mx-auto max-w-lg px-4 pt-10 pb-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] tracking-[4px] uppercase text-[#b12a2a] font-semibold mb-2">
                Barcelona
              </p>
              <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground leading-none">
                Corte<br />de Manga
              </h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-heading text-xl font-bold mb-6 text-foreground">{t("title")}</h2>
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

      {/* ── Footer ── */}
      <footer className="mx-auto max-w-lg px-4 pb-10">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <a
            href={`tel:${RESTAURANT_PHONE.replace(/\s/g, "")}`}
            className="flex items-center gap-2 text-foreground hover:text-[#b12a2a] transition-colors font-medium"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#b12a2a]/10 text-[#b12a2a] text-base">
              ↗
            </span>
            {RESTAURANT_PHONE}
          </a>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground text-xs">{RESTAURANT_ADDRESS}</span>
        </div>
      </footer>
    </main>
  );
}
