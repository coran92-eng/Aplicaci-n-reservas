import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("not_found");

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-6xl font-bold mb-4 text-foreground">404</p>
        <h1 className="text-xl font-semibold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t("message")}</p>
        <p className="text-sm text-muted-foreground mb-6">
          {t("phone_help")}{" "}
          <a href="tel:+34623216562" className="underline text-foreground">+34 623 216 562</a>
        </p>
        <Link href="/es">
          <Button className="w-full">{t("home")}</Button>
        </Link>
      </div>
    </main>
  );
}
