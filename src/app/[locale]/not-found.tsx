import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Shell } from "@/components/site/Shell";
import { RESTAURANT_PHONE, telHref } from "@/lib/site";

export default async function NotFound() {
  const t = await getTranslations("not_found");
  const locale = await getLocale();

  return (
    <Shell>
      <div className="cdm-col">
        <div className="cdm-sign center">
          <p className="cdm-lab">404</p>
          <h1 className="cdm-big" style={{ marginTop: 6 }}>{t("title")}</h1>
          <p className="cdm-sub">{t("message")}</p>
          <p className="cdm-t" style={{ marginTop: 14, fontSize: "0.9375rem" }}>
            {t("phone_help")}{" "}
            <a href={telHref(RESTAURANT_PHONE)} className="underline underline-offset-4 cdm-nw" style={{ color: "var(--cdm-fg)" }}>
              {RESTAURANT_PHONE}
            </a>
          </p>
          <div className="cdm-btns">
            <Link href={`/${locale}`} className="cdm-btn bg-primary text-primary-foreground inline-flex items-center justify-center">
              {t("home")}
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
