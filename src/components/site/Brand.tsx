import { BRAND_SPRITE, LOGO_VIEWBOX } from "./brand-svg";

/** Símbolos SVG compartidos (logo, tijeras, baldosa). Una vez por página. */
export function BrandSprite() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute" }}
      dangerouslySetInnerHTML={{ __html: BRAND_SPRITE }}
    />
  );
}

export function Logo() {
  return (
    <svg className="cdm-logo" viewBox={LOGO_VIEWBOX} role="img" aria-label="Corte de Manga">
      <use href="#cdm-logo" />
    </svg>
  );
}

export function Scissors() {
  return (
    <svg viewBox="-11 -6 24.5 12" aria-hidden="true" focusable="false">
      <use href="#cdm-tisora" />
    </svg>
  );
}

function Tiles() {
  return (
    <svg className="cdm-tl" viewBox="0 0 200 100" width="26" height="13" aria-hidden="true" focusable="false">
      <use href="#cdm-tile" x="0" width="100" height="100" />
      <use href="#cdm-tile" x="100" width="100" height="100" />
    </svg>
  );
}

/** La frase de la carta (igual en los tres idiomas, como en la web). */
export function Tagline() {
  return (
    <p className="cdm-tagline" lang="ca">
      <Tiles />
      <span>
        Cuina reconeixible. <b>Ben feta.</b>
      </span>
      <Tiles />
    </p>
  );
}
