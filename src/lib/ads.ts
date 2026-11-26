// Etiqueta de Google Ads (AW-18213186788): APAGADA salvo que la variable de Vercel GOOGLE_ADS_TAG valga "on".
// Mientras la campaña está parada no se carga, así no se instalan cookies publicitarias sin consentimiento.
// Antes de volver a encenderla hace falta el banner de cookies con Consent Mode v2
// (LSSI art. 22.2 y requisito de Google para el tráfico de la UE). Nunca en vistas previas ni en local.
export const GOOGLE_ADS_ON =
  process.env.GOOGLE_ADS_TAG === "on" &&
  process.env.VERCEL_ENV !== "preview" &&
  process.env.NODE_ENV !== "development";
