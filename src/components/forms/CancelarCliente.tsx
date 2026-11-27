"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelarPorToken } from "@/actions/reservas";

export function CancelarCliente({
  token,
  resumen,
  modificarHref,
  nuevaHref,
}: {
  token: string;
  /** «Dissabte, 28 de novembre · 16:30 · 2 persones»: que se vea qué reserva se cancela */
  resumen?: string;
  /** Alternativa a cancelar: cambiar la fecha o la hora */
  modificarHref?: string;
  nuevaHref?: string;
}) {
  const t = useTranslations("cancellation");
  const [state, setState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function handleCancel() {
    setState("loading");
    try {
      const result = await cancelarPorToken(token);
      if (result.ok) {
        setState("success");
      } else {
        setState("error");
        setErrorKey(result.error ?? "generic");
      }
    } catch {
      // Sin conexión o la web se ha actualizado mientras tanto: que no se quede en «Cancel·lant…»
      setState("error");
      setErrorKey("generic");
    }
  }

  function getErrorMessage(key: string | null): string {
    if (!key) return t("error_generic");
    // códigos que devuelve la función cancelar_reserva de la base de datos
    const errorMessages: Record<string, string> = {
      not_found: t("error_not_found"),
      token_not_found: t("error_not_found"),
      token_expired: t("error_not_found"),
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
        {nuevaHref && (
          <p className="cdm-center" style={{ marginTop: 18 }}>
            <Link href={nuevaHref} className="cdm-link">{t("rebook")}</Link>
          </p>
        )}
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
        {resumen && (
          <p style={{ margin: "14px 0 0", fontWeight: 700, fontSize: "1.125rem" }}>{resumen}</p>
        )}
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
      {modificarHref && (
        <p className="cdm-center" style={{ marginTop: 18 }}>
          {t("or_change")}{" "}
          <Link href={modificarHref} className="cdm-link">{t("change_link")}</Link>
        </p>
      )}
    </div>
  );
}
