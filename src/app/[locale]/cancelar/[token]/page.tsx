"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelarPorToken } from "@/actions/reservas";

export default function CancelarPage({
  params: { token },
}: {
  params: { token: string };
}) {
  const t = useTranslations("cancellation");
  const [state, setState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function handleCancel() {
    setState("loading");
    const result = await cancelarPorToken(token);
    if (result.ok) {
      setState("success");
    } else {
      setState("error");
      setErrorKey(result.error ?? "generic");
    }
  }

  function getErrorMessage(key: string | null): string {
    if (!key) return t("error_generic");
    const errorMessages: Record<string, string> = {
      token_not_found: t("error_not_found"),
      already_cancelled: t("error_already_cancelled"),
      cannot_cancel: t("error_cannot_cancel"),
    };
    return errorMessages[key] ?? t("error_generic");
  }

  if (state === "success") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl border border-border p-8 text-center">
          <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t("success_title")}</h1>
          <p className="text-muted-foreground">{t("success_info")}</p>
        </div>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl border border-border p-8 text-center">
          <XCircle className="h-14 w-14 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t("error_title")}</h1>
          <p className="text-muted-foreground">{getErrorMessage(errorKey)}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl border border-border p-8 text-center">
        <AlertCircle className="h-14 w-14 text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground mb-8">{t("info")}</p>
        <Button
          size="lg"
          variant="destructive"
          className="w-full"
          onClick={handleCancel}
          disabled={state === "loading"}
        >
          {state === "loading" ? t("cancelling") : t("button")}
        </Button>
      </div>
    </main>
  );
}
