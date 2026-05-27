import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default async function ReconfirmadoPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations("reconfirmado");

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#050505" }}>
      <div className="max-w-md w-full text-center px-6 py-16">
        <CheckCircle
          className="mx-auto mb-8"
          style={{ width: 56, height: 56, color: "#b12a2a" }}
        />
        <p
          className="mb-4"
          style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontSize: 10,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#555555",
            fontWeight: 600,
          }}
        >
          {process.env.RESTAURANT_NAME ?? "Corte de Manga"}
        </p>
        <h1
          style={{
            fontFamily: "'Syne', 'Impact', 'Arial Black', sans-serif",
            fontSize: 44,
            fontWeight: 800,
            color: "#ebebeb",
            lineHeight: 1.05,
            letterSpacing: -1,
            margin: "0 0 20px",
          }}
        >
          {t("title")}
        </h1>
        <p
          style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontSize: 15,
            fontWeight: 300,
            color: "#888888",
            lineHeight: 1.7,
            margin: "0 0 48px",
          }}
        >
          {t("subtitle")}
        </p>
        <Link
          href={`/${locale}`}
          style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#555555",
            textDecoration: "none",
          }}
        >
          {t("back_home")}
        </Link>
      </div>
    </main>
  );
}
