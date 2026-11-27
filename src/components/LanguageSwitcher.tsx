"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

const LOCALES = [
  { code: "ca", name: "Català" },
  { code: "es", name: "Castellano" },
  { code: "en", name: "English" },
] as const;

/** Idiomas como en la web: enlaces (funcionan sin JavaScript) que conservan la página y sus parámetros. */
export function LanguageSwitcher({ label }: { label: string }) {
  const locale = useLocale();
  const pathname = usePathname() || "/";
  const router = useRouter();

  function hrefFor(code: string) {
    const seg = pathname.split("/");
    if (seg.length > 1 && LOCALES.some((l) => l.code === seg[1])) seg[1] = code;
    else seg.splice(1, 0, code);
    return seg.join("/") || `/${code}`;
  }

  return (
    <nav className="cdm-lang" aria-label={label}>
      {LOCALES.map((l) => {
        const href = hrefFor(l.code);
        return (
          <Link
            key={l.code}
            href={href}
            // Sin precarga: cada precarga pasa por next-intl y cambia la cookie de idioma (NEXT_LOCALE) al de ese
            // enlace. El idioma recordado quedaba mal y, al cancelar, la acción la devolvía a su sitio y Next
            // repintaba la página: salía «Ja està cancel·lada» en vez de «Reserva cancel·lada».
            prefetch={false}
            hrefLang={l.code}
            lang={l.code}
            aria-current={l.code === locale ? "true" : undefined}
            onClick={(e) => {
              // el token de confirmar/modificar va en la URL: hay que conservarlo al cambiar de idioma
              const extra = window.location.search + window.location.hash;
              if (extra) {
                e.preventDefault();
                router.push(href + extra);
              }
            }}
          >
            {l.code.toUpperCase()}
            <span className="sr-only"> · {l.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
