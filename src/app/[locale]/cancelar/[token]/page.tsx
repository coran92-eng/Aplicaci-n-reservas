import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/site/Shell";
import { CancelarCliente } from "@/components/forms/CancelarCliente";
import { createServiceClient } from "@/lib/supabase/server";
import { formatTime } from "@/lib/utils";

// Página personal de cada reserva: fuera de los buscadores
export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

const localeMap: Record<string, string> = { es: "es-ES", ca: "ca-ES", en: "en-GB" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Problema = "not_found" | "already_cancelled" | "cannot_cancel";

export default async function CancelarPage({
  params: { locale, token },
}: {
  params: { locale: string; token: string };
}) {
  const t = await getTranslations("cancellation");

  // Se mira la reserva antes de enseñar el botón: un enlace de un correo antiguo (la reserva se cambió
  // y el enlace ya no vale) o una reserva ya cancelada se explican aquí, sin hacer pulsar para nada.
  let reserva: {
    fecha: string;
    hora: string;
    personas: number;
    estado: string;
    cancel_token_expires_at: string | null;
    updated_at?: string | null;
  } | null = null;
  if (UUID_RE.test(token)) {
    const sc = createServiceClient();
    const { data } = await sc
      .from("reservas")
      .select("fecha, hora, personas, estado, cancel_token_expires_at, updated_at")
      .eq("cancel_token", token)
      .maybeSingle();
    reserva = data;
  }

  let problema: Problema | null = null;
  if (!reserva) problema = "not_found";
  else if (reserva.cancel_token_expires_at && new Date(reserva.cancel_token_expires_at) < new Date()) problema = "not_found";
  else if (reserva.estado === "cancelada") problema = "already_cancelled";
  else if (reserva.estado !== "confirmada" && reserva.estado !== "pendiente_aprobacion") problema = "cannot_cancel";

  // Cancelada hace un momento (lo normal: el cliente acaba de pulsar). Si la página se vuelve a pintar justo
  // después, o la recarga, se le confirma la cancelación en vez de decirle que «ja estava cancel·lada».
  const recienCancelada =
    problema === "already_cancelled" &&
    !!reserva?.updated_at &&
    Date.now() - new Date(reserva.updated_at).getTime() < 15 * 60 * 1000;
  if (recienCancelada) {
    return (
      <Shell>
        <div className="cdm-col">
          <div className="cdm-sign center" role="status">
            <div className="cdm-badge"><Check aria-hidden /></div>
            <h1 className="cdm-big">{t("success_title")}</h1>
            <p className="cdm-sub">{t("success_info")}</p>
          </div>
          <p className="cdm-center" style={{ marginTop: 18 }}>
            <Link href={`/${locale}`} className="cdm-link">{t("rebook")}</Link>
          </p>
        </div>
      </Shell>
    );
  }

  if (problema || !reserva) {
    const titulo = problema === "already_cancelled" ? t("cancelled_title") : problema === "cannot_cancel" ? t("cannot_title") : t("invalid_title");
    const texto = problema === "already_cancelled" ? t("error_already_cancelled") : problema === "cannot_cancel" ? t("error_cannot_cancel") : t("error_not_found");
    return (
      <Shell>
        <div className="cdm-col">
          <div className="cdm-sign center" role="alert">
            <h1 className="cdm-big">{titulo}</h1>
            <p className="cdm-sub">{texto}</p>
          </div>
          <p className="cdm-center" style={{ marginTop: 18 }}>
            <Link href={`/${locale}`} className="cdm-link">{t("rebook")}</Link>
          </p>
        </div>
      </Shell>
    );
  }

  const [y, m, d] = reserva.fecha.split("-").map(Number);
  const fecha = new Date(y, m - 1, d).toLocaleDateString(localeMap[locale] ?? "es-ES", {
    weekday: "long", day: "numeric", month: "long",
  });
  const resumen = `${fecha.charAt(0).toUpperCase()}${fecha.slice(1)} · ${formatTime(reserva.hora)} · ${t("guests", { count: reserva.personas })}`;

  return (
    <Shell>
      <CancelarCliente
        token={token}
        resumen={resumen}
        // Una pendiente de aprobar no tiene «cambiar»: solo se cambian las confirmadas
        modificarHref={reserva.estado === "confirmada" ? `/${locale}/modificar/${token}` : undefined}
        nuevaHref={`/${locale}`}
      />
    </Shell>
  );
}
