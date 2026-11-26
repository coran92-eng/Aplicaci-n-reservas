// Datos públicos del bar, iguales que en cortedemanga.es y en la carta.
export const SITE = {
  web: "https://cortedemanga.es/",
  // la carta vive en la web (cortedemanga.es/carta/); carta.cortedemanga.es redirigirá allí
  carta: "https://cortedemanga.es/carta/",
  instagram: "https://www.instagram.com/cortedemangabcn",
  email: "cortedemangabcn@gmail.com",
  // WhatsApp del bar: solo mensajes (no llamadas)
  whatsapp: "34685900566",
  whatsappDisplay: "+34 685 900 566",
  maps: "https://www.google.com/maps/search/?api=1&query=Corte%20de%20Manga&query_place_id=ChIJs9BCkNejpBIRlkboD_gXYzc",
  titular: "Grupo Daco BCN, S.L.",
} as const;

// Teléfono para llamadas sobre reservas (variable de Vercel; por defecto el de siempre)
export const RESTAURANT_PHONE = process.env.RESTAURANT_PHONE ?? "+34 623 216 562";

// En Vercel está como "+34623216562": para leerlo, en grupos como el WhatsApp de la web
export function formatPhone(raw: string): string {
  const m = raw.replace(/[^\d+]/g, "").match(/^(?:\+34|0034)?([6789]\d{2})(\d{3})(\d{3})$/);
  return m ? `+34 ${m[1]} ${m[2]} ${m[3]}` : raw.trim();
}
export const PHONE_DISPLAY = formatPhone(RESTAURANT_PHONE);

// Dirección tal como sale en la web y en la carta
export const ADDRESS = { street: "Carrer del Comte d’Urgell, 108", city: "08011 Barcelona" } as const;

export function waLink(text?: string): string {
  return `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
