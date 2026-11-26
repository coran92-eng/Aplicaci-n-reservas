import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { confirmarAsistencia } from "@/actions/reconfirmar";
import { formatTime } from "@/lib/utils";
import type { Metadata } from "next";
import { Shell } from "@/components/site/Shell";

// Enlace personal del recordatorio: fuera de los buscadores
export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

const localeMap: Record<string, string> = { es: "es-ES", ca: "ca-ES", en: "en-GB" };

export default async function ReconfirmarPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { t?: string };
}) {
  const t = await getTranslations("reconfirmar");
  const token = searchParams.t ?? "";

  let reserva: { fecha: string; hora: string; personas: number; estado: string; reconfirmado: boolean } | null = null;
  if (token) {
    const sc = createServiceClient();
    const { data } = await sc
      .from("reservas")
      .select("fecha, hora, personas, estado, reconfirmado")
      .eq("reconfirmacion_token", token)
      .maybeSingle();
    reserva = data;
  }

  const invalid = !reserva || reserva.estado === "cancelada" || reserva.estado === "rechazada";
  if (reserva && !invalid && reserva.reconfirmado) redirect(`/${locale}/reconfirmado`);

  let dateLabel = "";
  if (reserva) {
    const [y, m, d] = reserva.fecha.split("-").map(Number);
    dateLabel = new Date(y, m - 1, d).toLocaleDateString(localeMap[locale] ?? "es-ES", {
      weekday: "long", day: "numeric", month: "long",
    });
  }

  return (
    <Shell>
      <div className="cdm-col">
        <div className="cdm-sign center">
          {invalid || !reserva ? (
            <>
              <h1 className="cdm-big">{t("invalid_title")}</h1>
              <p className="cdm-sub">{t("invalid_subtitle")}</p>
            </>
          ) : (
            <>
              <h1 className="cdm-big">{t("title")}</h1>
              <p className="cdm-sub">{t("subtitle")}</p>
              <p style={{ margin: "16px 0 0", fontWeight: 700, fontSize: "1.125rem" }}>
                {dateLabel.replace(/^./, (c) => c.toUpperCase())} · {formatTime(reserva.hora)} · {reserva.personas} {t("people")}
              </p>
              <form action={confirmarAsistencia} className="cdm-btns">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="locale" value={locale} />
                <button type="submit" className="cdm-btn bg-primary text-primary-foreground inline-flex items-center justify-center">
                  {t("button")}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="cdm-center" style={{ marginTop: 18 }}>
          <Link href={`/${locale}`} className="cdm-link">{t("back_home")}</Link>
        </p>
      </div>
    </Shell>
  );
}
