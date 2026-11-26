import { getTranslations } from "next-intl/server";
import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { formatTime } from "@/lib/utils";
import type { Reserva } from "@/lib/supabase/types";
import { GtagConversion } from "@/components/GtagConversion";
import { Shell } from "@/components/site/Shell";

// Página personal de cada solicitud: fuera de los buscadores
export const metadata: Metadata = { robots: { index: false, follow: false } };

function formatDateForDisplay(fecha: string, locale: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const localeMap: Record<string, string> = { es: "es-ES", ca: "ca-ES", en: "en-GB" };
  return date.toLocaleDateString(localeMap[locale] ?? "es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default async function SolicitudRecibidaPage({
  params: { locale, id },
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams: { emailError?: string; token?: string };
}) {
  const emailError = searchParams.emailError;
  const t = await getTranslations("confirmation");

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("reservas")
    .select("*")
    .eq("id", id)
    .single();

  const reserva = data as Reserva | null;
  if (!reserva || reserva.cancel_token !== searchParams.token) notFound();

  return (
    <Shell>
      <GtagConversion sendTo="AW-18213186788/8_gbCN7D47gcEOTZ3OxD" value={133.0} currency="EUR" />
      <div className="cdm-col">
        <div className="cdm-sign">
          <div className="cdm-center">
            <div className="cdm-badge pend"><Clock aria-hidden /></div>
            <h1 className="cdm-big">{t("title_pending")}</h1>
            <p className="cdm-sub">{t("subtitle_pending")}</p>
          </div>

          <h2 className="cdm-lab" style={{ margin: "22px 0 8px" }}>{t("details")}</h2>
          <dl className="cdm-dl">
            <div>
              <dt>{t("name")}</dt>
              <dd>{reserva.nombre} {reserva.apellido}</dd>
            </div>
            <div>
              <dt>{t("date")}</dt>
              <dd>{formatDateForDisplay(reserva.fecha, locale)}</dd>
            </div>
            <div>
              <dt>{t("time")}</dt>
              <dd>{formatTime(reserva.hora)}</dd>
            </div>
            <div>
              <dt>{t("people")}</dt>
              <dd>{reserva.personas}</dd>
            </div>
          </dl>

          <p className="cdm-note" style={{ marginTop: 18 }}>{t("pending_info")}</p>

          {emailError && (
            <div className="cdm-err" role="alert" style={{ marginTop: 14 }}>
              <p style={{ fontWeight: 700 }}>{t("email_not_sent")}</p>
              <code>{emailError}</code>
            </div>
          )}

          <p className="cdm-t" style={{ marginTop: 14, fontSize: "0.9375rem" }}>Carrer del Comte d’Urgell, 108 · 08011 Barcelona</p>
        </div>
        <p className="cdm-center" style={{ marginTop: 18 }}>
          <Link href={`/${locale}`} className="cdm-link">{t("back_home")}</Link>
        </p>
      </div>
    </Shell>
  );
}
