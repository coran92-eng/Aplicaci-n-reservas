"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelarPorToken } from "@/actions/reservas";

export function CancelarCliente({ token }: { token: string }) {
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
      <div className="cdm-col">
        <div className="cdm-sign center" role="status">
          <div className="cdm-badge"><Check aria-hidden /></div>
          <h1 className="cdm-big">{t("success_title")}</h1>
          <p className="cdm-sub">{t("success_info")}</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="cdm-col">
        <div className="cdm-sign center" role="alert">
          <div className="cdm-badge pend"><X aria-hidden /></div>
          <h1 className="cdm-big">{t("error_title")}</h1>
          <p className="cdm-sub">{getErrorMessage(errorKey)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cdm-col">
      <div className="cdm-sign center">
        <div className="cdm-badge pend"><AlertTriangle aria-hidden /></div>
        <h1 className="cdm-big">{t("title")}</h1>
        <p className="cdm-sub">{t("info")}</p>
        <div className="cdm-btns">
          <Button
            size="lg"
            variant="destructive"
            className="cdm-btn w-full"
            onClick={handleCancel}
            disabled={state === "loading"}
          >
            {state === "loading" ? t("cancelling") : t("button")}
          </Button>
        </div>
      </div>
    </div>
  );
}
