const CANONICAL_APP_URL = "https://reservas.cortedemanga.es";

// En producción la URL es fija: una NEXT_PUBLIC_APP_URL mal configurada en Vercel
// rompía los links de los emails. En local se permite sobreescribirla.
export const APP_URL =
  process.env.NODE_ENV === "production"
    ? CANONICAL_APP_URL
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
