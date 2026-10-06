import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { confirmarAsistencia } from "@/actions/reconfirmar";
import { formatTime } from "@/lib/utils";

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

  const heading = {
    fontFamily: "'Syne', 'Impact', 'Arial Black', sans-serif",
    fontSize: 40,
    fontWeight: 800,
    color: "#ebebeb",
    lineHeight: 1.05,
    letterSpacing: -1,
    margin: "0 0 20px",
  } as const;
  const body = {
    fontFamily: "'Inter', -apple-system, sans-serif",
    fontSize: 15,
    color: "#888888",
    lineHeight: 1.7,
    margin: "0 0 32px",
  } as const;

  let dateLabel = "";
  if (reserva) {
    const [y, m, d] = reserva.fecha.split("-").map(Number);
    dateLabel = new Date(y, m - 1, d).toLocaleDateString(localeMap[locale] ?? "es-ES", {
      weekday: "long", day: "numeric", month: "long",
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#050505" }}>
      <div className="max-w-md w-full text-center px-6 py-16">
        {invalid || !reserva ? (
          <>
            <h1 style={heading}>{t("invalid_title")}</h1>
            <p style={body}>{t("invalid_subtitle")}</p>
          </>
        ) : (
          <>
            <h1 style={heading}>{t("title")}</h1>
            <p style={{ ...body, margin: "0 0 12px" }}>{t("subtitle")}</p>
            <p style={{ ...body, color: "#ebebeb", textTransform: "capitalize", margin: "0 0 32px" }}>
              {dateLabel} · {formatTime(reserva.hora)} · {reserva.personas} {t("people")}
            </p>
            <form action={confirmarAsistencia}>
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                style={{
                  backgroundColor: "#b12a2a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 3,
                  padding: "14px 36px",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {t("button")}
              </button>
            </form>
          </>
        )}
        <p style={{ marginTop: 40 }}>
          <Link
            href={`/${locale}`}
            style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#555555", textDecoration: "none" }}
          >
            {t("back_home")}
          </Link>
        </p>
      </div>
    </main>
  );
}
