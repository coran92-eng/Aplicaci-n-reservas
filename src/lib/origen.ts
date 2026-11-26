// De dónde llega cada reserva (sin cookies): la web y los enlaces externos añaden ?src=… al enlace de reservas.
// Se guarda tal cual en reservas.origen (columna de supabase/migrations/012_origen.sql) y el panel lo resume.

export const ORIGEN_LABELS: Record<string, string> = {
  "web-portada": "Web · portada",
  "web-carta": "Web · carta",
  "web-grups": "Web · menús de grupo",
  "web-nadal": "Web · Navidad",
  web: "Web · otras páginas",
  google: "Ficha de Google",
  instagram: "Instagram",
};

/** Normaliza el valor de ?src=: minúsculas, letras, números y guiones (2–32). Lo demás se descarta. */
export function normalizaOrigen(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return /^[a-z0-9-]{2,32}$/.test(s) ? s : null;
}

export function etiquetaOrigen(origen: string | null | undefined): string {
  if (!origen) return "Directo o sin dato";
  return ORIGEN_LABELS[origen] ?? origen;
}
