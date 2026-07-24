"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresca los datos del servidor (router.refresh) cada `intervalMs`.
 * - No recarga la página entera: mantiene scroll y estado del cliente.
 * - Pausa cuando la pestaña/tablet está en segundo plano.
 * - Refresca de inmediato al volver al primer plano.
 */
export function AutoRefresh({ intervalMs = 120000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) router.refresh();
    };
    const id = setInterval(tick, intervalMs);

    const onVisible = () => {
      if (!document.hidden) router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
