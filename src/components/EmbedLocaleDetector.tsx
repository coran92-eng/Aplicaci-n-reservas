"use client";
import { useEffect } from "react";

function detectLocale(): string {
  const langs = Array.from(navigator.languages ?? [navigator.language]);
  for (const lang of langs) {
    const code = lang.toLowerCase().split("-")[0];
    if (code === "ca") return "ca";
    if (code === "en") return "en";
    if (code === "es") return "es";
  }
  return "es";
}

export function EmbedLocaleDetector({ currentLocale }: { currentLocale: string }) {
  useEffect(() => {
    const detected = detectLocale();
    if (detected !== currentLocale) {
      window.location.replace(`/${detected}/embed`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
