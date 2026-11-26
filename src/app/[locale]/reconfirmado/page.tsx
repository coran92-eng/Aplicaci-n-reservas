import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Shell } from "@/components/site/Shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ReconfirmadoPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations("reconfirmado");

  return (
    <Shell>
      <div className="cdm-col">
        <div className="cdm-sign center" role="status">
          <div className="cdm-badge"><Check aria-hidden /></div>
          <p className="cdm-lab">{process.env.RESTAURANT_NAME ?? "Corte de Manga"}</p>
          <h1 className="cdm-big" style={{ marginTop: 6 }}>{t("title")}</h1>
          <p className="cdm-sub">{t("subtitle")}</p>
        </div>
        <p className="cdm-center" style={{ marginTop: 18 }}>
          <Link href={`/${locale}`} className="cdm-link">{t("back_home")}</Link>
        </p>
      </div>
    </Shell>
  );
}
