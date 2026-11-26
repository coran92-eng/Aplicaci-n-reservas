import { useLocale, useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RESTAURANT_PHONE, SITE, telHref, waLink } from "@/lib/site";
import { BrandSprite, Logo, Scissors, Tagline } from "./Brand";

/** Cabecera y pie de cortedemanga.es alrededor de cada página pública de reservas. */
export function Shell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("site");
  const locale = useLocale();

  return (
    <div className="cdm-shell">
      <BrandSprite />
      <a className="cdm-skip" href="#contingut">
        {t("skip")}
      </a>

      <header className="cdm-site">
        <div className="cdm-wrap cdm-hbar">
          <a className="cdm-brand" href={SITE.web} aria-label={t("home_label")}>
            <Logo />
          </a>
          <span className="cdm-cut" aria-hidden="true">
            <Scissors />
          </span>
          <LanguageSwitcher label={t("lang_label")} />
        </div>
      </header>

      <main id="contingut" className="cdm-main">
        {children}
      </main>

      <footer className="cdm-foot">
        <div className="cdm-wrap cdm-foot-g">
          <div>
            <a className="cdm-brand" href={SITE.web} aria-label={t("home_label")}>
              <Logo />
            </a>
            <Tagline />
          </div>
          <div>
            <h2 className="cdm-fh">{t("foot_visit")}</h2>
            <p>
              Carrer del Comte d’Urgell, 108
              <br />
              08011 Barcelona
            </p>
            <p>{t("foot_daily")}</p>
            <p>
              <a href={SITE.maps}>{t("directions")}</a>
            </p>
          </div>
          <div>
            <h2 className="cdm-fh">{t("foot_contact")}</h2>
            <p>
              <a href={telHref(RESTAURANT_PHONE)}>
                {t("phone")} · <span className="cdm-nw">{RESTAURANT_PHONE}</span>
              </a>
            </p>
            <p>
              <a href={waLink(t("wa_text"))}>
                {t("foot_wa")}
                <br />
                <span className="cdm-nw">{SITE.whatsappDisplay}</span>
              </a>
            </p>
            <p>
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </p>
          </div>
          <div>
            <h2 className="cdm-fh">{t("foot_more")}</h2>
            <ul>
              <li>
                <a href={SITE.web}>{t("web")}</a>
              </li>
              <li>
                <a href={`${SITE.carta}${locale}/`}>{t("carta")}</a>
              </li>
              <li>
                <a href={`/${locale}/privacidad`}>{t("privacy")}</a>
              </li>
              <li>
                <a href={SITE.instagram}>Instagram · @cortedemangabcn</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="cdm-wrap cdm-foot-b">
          <p>
            © {new Date().getFullYear()} {SITE.titular}
          </p>
        </div>
        <div className="cdm-tileband" aria-hidden="true" />
      </footer>
    </div>
  );
}
