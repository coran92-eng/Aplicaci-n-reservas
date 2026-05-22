import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ReservationForm } from "@/components/forms/ReservationForm";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { FranjaBloqueada, DiaCerrado, Configuracion } from "@/lib/supabase/types";

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations("form");
  const supabase = createClient();

  const [{ data: fb }, { data: dc }, { data: cr }] = await Promise.all([
    supabase.from("franjas_bloqueadas").select("*"),
    supabase.from("dias_cerrados").select("*"),
    supabase.from("configuracion").select("clave, valor"),
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

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Corte de Manga
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Comte d&apos;Urgell 108, Barcelona
            </p>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-6">{t("title")}</h2>
          <ReservationForm
            franjasBloqueadas={franjasBloqueadas}
            diasCerrados={diasCerrados}
            limiteGrupo={limiteGrupo}
            antelacionMax={antelacionMax}
          />
        </div>
      </div>
    </main>
  );
}
