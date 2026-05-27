"use client";

import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

const locales = [
  { code: "ca", label: "CA" },
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex items-center gap-1" role="navigation" aria-label="Language selector">
      {locales.map((l, i) => (
        <span key={l.code} className="flex items-center">
          <button
            onClick={() => switchLocale(l.code)}
            className={cn(
              "text-sm font-medium px-1 py-0.5 rounded transition-colors",
              locale === l.code
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-current={locale === l.code ? "true" : undefined}
          >
            {l.label}
          </button>
          {i < locales.length - 1 && (
            <span className="text-muted-foreground text-xs">|</span>
          )}
        </span>
      ))}
    </div>
  );
}
