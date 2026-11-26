import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Shell } from "@/components/site/Shell";
import { PRIVACIDAD } from "@/content/privacidad";
import { SITE } from "@/lib/site";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const c = PRIVACIDAD[(locale as "ca" | "es" | "en")] ?? PRIVACIDAD.es;
  return { title: `${c.title} · Corte de Manga` };
}

/** Convierte el email y aepd.es en enlaces. */
function Texto({ s }: { s: string }) {
  const parts = s.split(/(cortedemangabcn@gmail\.com|aepd\.es)/);
  return (
    <>
      {parts.map((part, i) =>
        part === SITE.email ? (
          <a key={i} href={`mailto:${SITE.email}`} className="underline underline-offset-4">
            {part}
          </a>
        ) : part === "aepd.es" ? (
          <a key={i} href="https://www.aepd.es" className="underline underline-offset-4">
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}

export default async function PrivacidadPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations("privacy");
  const c = PRIVACIDAD[(locale as "ca" | "es" | "en")] ?? PRIVACIDAD.es;

  return (
    <Shell>
      <div className="cdm-col wide">
        <p style={{ margin: "0 0 14px" }}>
          <Link href={`/${locale}`} className="cdm-link">
            ← {t("back")}
          </Link>
        </p>
        <article className="cdm-legal">
          <h1>{c.title}</h1>
          <p className="upd">{c.updated}</p>
          {c.blocks.map((b) => (
            <section key={b.h}>
              <h2>{b.h}</h2>
              {b.p?.map((s) => (
                <p key={s}>
                  <Texto s={s} />
                </p>
              ))}
              {b.ul && (
                <ul>
                  {b.ul.map((s) => (
                    <li key={s}>
                      <Texto s={s} />
                    </li>
                  ))}
                </ul>
              )}
              {b.table && (
                <div className="cdm-tscroll">
                  <table>
                    <thead>
                      <tr>
                        {b.table.head.map((h) => (
                          <th key={h} scope="col">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.table.rows.map((r) => (
                        <tr key={r[0]}>
                          {r.map((cell, i) => (i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {b.nota && (
                <p style={{ fontSize: "0.9375rem", color: "var(--cdm-soft)" }}>
                  <Texto s={b.nota} />
                </p>
              )}
              {b.pd?.map((s) => (
                <p key={s}>
                  <Texto s={s} />
                </p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </Shell>
  );
}
