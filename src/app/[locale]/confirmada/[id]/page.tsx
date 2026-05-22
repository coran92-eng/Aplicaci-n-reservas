import { getTranslations } from "next-intl/server";
import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils";
import type { Reserva } from "@/lib/supabase/types";

function formatDateForDisplay(fecha: string, locale: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const localeMap: Record<string, string> = { es: "es-ES", ca: "ca-ES", en: "en-GB" };
  return date.toLocaleDateString(localeMap[locale] ?? "es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ConfirmadaPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = await getTranslations("confirmation");

  if (id === "honeypot") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        </div>
      </main>
    );
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("reservas")
    .select("*")
    .eq("id", id)
    .single();

  const reserva = data as Reserva | null;

  if (!reserva) notFound();

  const isPending = reserva.estado === "pendiente_aprobacion";

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8">
        <div className="text-center mb-8">
          <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {isPending ? t("title_pending") : t("title")}
          </h1>
          <p className="text-muted-foreground">
            {isPending ? t("subtitle_pending") : t("subtitle")}
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-3 mb-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("details")}
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("name")}</span>
            <span className="font-medium">
              {reserva.nombre} {reserva.apellido}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("date")}</span>
            <span className="font-medium">{formatDateForDisplay(reserva.fecha, locale)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("time")}</span>
            <span className="font-medium">{formatTime(reserva.hora)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("people")}</span>
            <span className="font-medium">{reserva.personas}</span>
          </div>
        </div>

        {reserva.notas_cliente && (
          <div className="rounded-lg bg-gray-50 border p-4 mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Comentarios</p>
            <p className="text-sm">{reserva.notas_cliente}</p>
          </div>
        )}

        {isPending ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
            {t("pending_info")}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground text-center mb-6">
            {t("cancel_info")}
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Comte d&apos;Urgell 108, 08011 Barcelona</span>
          </div>
          <a
            href={process.env.RESTAURANT_GOOGLE_MAPS_URL ?? "https://maps.google.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button variant="outline" size="sm" className="w-full">
              {t("address")}
            </Button>
          </a>
        </div>

        <div className="mt-6 text-center">
          <Link
            href={`/${locale}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("back_home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
