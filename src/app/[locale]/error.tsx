"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="text-xl font-semibold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t("message")}</p>
        <p className="text-sm text-muted-foreground mb-6">
          {t("phone_help")}{" "}
          <a href="tel:+34623216562" className="underline text-foreground">+34 623 216 562</a>
        </p>
        <div className="flex gap-3">
          <Button onClick={reset} variant="outline" className="flex-1">
            {t("retry")}
          </Button>
          <Link href={`/${locale}`} className="flex-1">
            <Button className="w-full">{t("home")}</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
