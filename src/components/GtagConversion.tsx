"use client";
import { useEffect } from "react";

export function GtagConversion({
  sendTo,
  value,
  currency,
}: {
  sendTo: string;
  value?: number;
  currency?: string;
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "conversion", {
        send_to: sendTo,
        ...(value !== undefined && { value }),
        ...(currency !== undefined && { currency }),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
