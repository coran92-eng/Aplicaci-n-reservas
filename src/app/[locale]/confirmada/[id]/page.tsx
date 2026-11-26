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
import { SITE } from "@/lib/site";

// Página personal de cada reserva: fuera de los buscadores
export const metadata: Metadata = { robots: { index: false, follow: false } };

function Check() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

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
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams: { emailError?: string; token?: string };
}) {
  const emailError = searchParams.emailError;
  const t = await getTranslations("confirmation");

  if (id === "honeypot") {
    return (
      <Shell>
        <div className="cdm-col">
          <div className="cdm-sign center">
            <div className="cdm-badge"><Check /></div>
            <h1 className="cdm-big">{t("title")}</h1>
          </div>
        </div>
      </Shell>
    );
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("reservas")
    .select("*")
    .eq("id", id)
    .single();

  const reserva = data as Reserva | null;

  if (!reserva || reserva.cancel_token !== searchParams.token) notFound();

  const isPending = reserva.estado === "pendiente_aprobacion";

  return (
    <Shell>
      {!isPending && (
        <GtagConversion
          sendTo="AW-18213186788/MkMuCMeWucEcEOTZ3OxD"
          value={50.0}
          currency="EUR"
          userData={{
            email: reserva.email,
            phone_number: reserva.telefono,
            first_name: reserva.nombre,
            last_name: reserva.apellido,
          }}
        />
      )}
      <div className="cdm-col">
        <div className="cdm-sign">
          <div className="cdm-center">
            <div className={`cdm-badge ${isPending ? "pend" : ""}`}>{isPending ? <Clock aria-hidden /> : <Check />}</div>
            <h1 className="cdm-big">{isPending ? t("title_pending") : t("title")}</h1>
            <p className="cdm-sub">{isPending ? t("subtitle_pending") : t("subtitle")}</p>
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

          {reserva.notas_cliente && (
            <div style={{ marginTop: 16 }}>
              <h2 className="cdm-lab">{t("comments")}</h2>
              <p className="cdm-quote">{reserva.notas_cliente}</p>
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            {isPending ? (
              <p className="cdm-note">{t("pending_info")}</p>
            ) : (
              <p className="cdm-t" style={{ fontSize: "0.9375rem" }}>
                {t("cancel_info")}{" "}
                <Link href={`/${locale}/modificar/${reserva.cancel_token}`} className="underline underline-offset-4" style={{ color: "var(--cdm-fg)" }}>
                  {t("modify_link")}
                </Link>
              </p>
            )}
          </div>

          {emailError && (
            <div className="cdm-err" role="alert" style={{ marginTop: 14 }}>
              <p style={{ fontWeight: 700 }}>{t("email_not_sent")}</p>
              <code>{emailError}</code>
            </div>
          )}

          <div className="cdm-btns">
            <a className="cdm-btn bg-primary text-primary-foreground inline-flex items-center justify-center" href={SITE.maps}>
              {t("address")}
            </a>
          </div>
          <p className="cdm-t" style={{ marginTop: 12, fontSize: "0.9375rem" }}>Carrer del Comte d’Urgell, 108 · 08011 Barcelona</p>
        </div>
        <p className="cdm-center" style={{ marginTop: 18 }}>
          <Link href={`/${locale}`} className="cdm-link">{t("back_home")}</Link>
        </p>
      </div>
    </Shell>
  );
}
