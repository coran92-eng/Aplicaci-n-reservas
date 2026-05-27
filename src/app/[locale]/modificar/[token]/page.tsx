import { getTranslations } from "next-intl/server";
import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatTime, generateTimeSlots, todayBarcelona, addDaysToDate } from "@/lib/utils";
import type { Reserva } from "@/lib/supabase/types";
import { ModificarForm } from "@/components/forms/ModificarForm";
import Link from "next/link";

function formatDateForDisplay(fecha: string, locale: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const localeMap: Record<string, string> = { es: "es-ES", ca: "ca-ES", en: "en-GB" };
  return new Date(y, m - 1, d).toLocaleDateString(localeMap[locale] ?? "es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default async function ModificarPage({
  params: { locale, token },
}: {
  params: { locale: string; token: string };
}) {
  const t = await getTranslations("modification");
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("reservas")
    .select("*")
    .eq("cancel_token", token)
    .single();

  const reserva = data as Reserva | null;
  if (!reserva) notFound();

  const isClosed = reserva.estado === "cancelada" || reserva.estado === "rechazada";

  if (isClosed) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-muted-foreground">{t("error_cannot_modify")}</p>
          <Link href={`/${locale}`} className="mt-6 block text-sm text-muted-foreground hover:text-foreground">
            {t("back_home")}
          </Link>
        </div>
      </main>
    );
  }

  const today = todayBarcelona();

  const { data: diasCerradosData } = await supabase
    .from("dias_cerrados")
    .select("fecha")
    .gte("fecha", today);

  const { data: franjasData } = await supabase
    .from("franjas_bloqueadas")
    .select("fecha, hora")
    .gte("fecha", today);

  const closedDates = new Set((diasCerradosData ?? []).map((d: { fecha: string }) => d.fecha));
  const franjasBloqueadas = (franjasData ?? []) as { fecha: string; hora: string }[];
  const allSlots = generateTimeSlots();
  const maxDate = addDaysToDate(today, 90);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl border border-border p-8">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold mb-2">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-2.5 text-sm mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("current")}</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{reserva.nombre} {reserva.apellido}</span>
            <span className="font-medium">{reserva.personas} pers.</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground capitalize">{formatDateForDisplay(reserva.fecha, locale)}</span>
            <span className="font-medium">{formatTime(reserva.hora)}</span>
          </div>
        </div>

        <ModificarForm
          token={token}
          locale={locale}
          today={today}
          maxDate={maxDate}
          closedDates={closedDates}
          franjasBloqueadas={franjasBloqueadas}
          allSlots={allSlots}
        />

        <div className="mt-6 text-center">
          <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground">
            {t("back_home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
