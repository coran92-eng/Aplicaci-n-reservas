"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shell } from "@/components/site/Shell";
import { RESTAURANT_PHONE, telHref } from "@/lib/site";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors_page");
  const params = useParams();
  const locale = (params?.locale as string) ?? "es";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Shell>
      <div className="cdm-col">
        <div className="cdm-sign center" role="alert">
          <h1 className="cdm-big">{t("title")}</h1>
          <p className="cdm-sub">{t("message")}</p>
          <p className="cdm-t" style={{ marginTop: 14, fontSize: "0.9375rem" }}>
            {t("phone_help")}{" "}
            <a href={telHref(RESTAURANT_PHONE)} className="underline underline-offset-4 cdm-nw" style={{ color: "var(--cdm-fg)" }}>
              {RESTAURANT_PHONE}
            </a>
          </p>
          <div className="cdm-btns">
            <Button onClick={reset} className="cdm-btn cdm-ghost">
              {t("retry")}
            </Button>
            <Link href={`/${locale}`} className="cdm-btn bg-primary text-primary-foreground inline-flex items-center justify-center">
              {t("home")}
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
