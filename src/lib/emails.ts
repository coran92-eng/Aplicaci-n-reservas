import { Resend } from "resend";
import { APP_URL } from "./app-url";
import { ADDRESS, PHONE_DISPLAY, RESTAURANT_PHONE, SITE, telHref, waLink } from "./site";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurada");
  return new Resend(key);
}

// Resend v4 NO lanza excepción cuando rechaza un envío: devuelve { error }.
// Sin esta comprobación los fallos pasaban por "enviado".
async function sendEmail(payload: Parameters<Resend["emails"]["send"]>[0]): Promise<void> {
  // Si el cliente responde al email, la respuesta llega al correo del bar (reservas@ no tiene buzón)
  const withReply = { ...payload, replyTo: payload.replyTo ?? REPLY_TO } as typeof payload;
  const { error } = await getResend().emails.send(withReply);
  if (error) {
    throw Object.assign(new Error(error.message), {
      name: error.name,
      statusCode: (error as { statusCode?: number | null }).statusCode ?? undefined,
    });
  }
}

const RESTAURANT_NAME = process.env.RESTAURANT_NAME ?? "Corte de Manga";
const FROM_EMAIL      = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const FROM            = `${RESTAURANT_NAME} <${FROM_EMAIL}>`;
const REPLY_TO        = process.env.RESEND_REPLY_TO ?? SITE.email;
// Dirección, teléfono y mapa: los mismos de la web y la carta (antes salían de variables de Vercel con otro formato)
const ADDRESS_LINE    = `${ADDRESS.street} · ${ADDRESS.city}`;
const ADDRESS_PLAIN   = `${ADDRESS.street}, ${ADDRESS.city}`;
const LOGO_URL        = process.env.RESTAURANT_LOGO_URL || `${APP_URL}/email/logo-cdm.png`;

interface ReservaEmailData {
  /** id de la reserva: identifica el evento del calendario aunque cambie el enlace */
  id?: string;
  nombre: string;
  apellido: string;
  email: string;
  fecha: string;
  hora: string;
  personas: number;
  cancel_token: string;
  idioma: string;
}

// ── Idioma y fechas ────────────────────────────────────────────

type Lang = "es" | "ca" | "en";
const lang = (idioma: string): Lang => (idioma === "ca" || idioma === "en" ? idioma : "es");
const LOCALE: Record<Lang, string> = { es: "es-ES", ca: "ca-ES", en: "en-GB" };

function formatFechaEmail(fecha: string, idioma: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(LOCALE[lang(idioma)], {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatShortDate(fecha: string, idioma: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(LOCALE[lang(idioma)], {
    day: "numeric", month: "short",
  });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function weekday(fecha: string, idioma: string, plusDays = 0): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE[lang(idioma)], { weekday: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d + plusDays)));
}

const isMadrugada = (hora: string) => hora.slice(0, 2) === "00";

/** "16:30". Las franjas 00:xx son la madrugada de esa noche: se aclara para que nadie venga un día antes. */
function horaLabel(fecha: string, hora: string, idioma: string): string {
  const h = hora.slice(0, 5);
  if (!isMadrugada(hora)) return h;
  const a = weekday(fecha, idioma);
  const b = weekday(fecha, idioma, 1);
  const L = lang(idioma);
  if (L === "ca") return `${h} (nit de ${a} a ${b})`;
  if (L === "en") return `${h} (${a} night, after midnight)`;
  return `${h} (noche del ${a} al ${b})`;
}

// ── Hora real de la reserva (Barcelona) ────────────────────────

/** Minutos que Barcelona va por delante de UTC en ese instante (60 en invierno, 120 en verano). */
function madridOffsetMin(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** Instante de la reserva. Una franja 00:xx del día D es la madrugada del día D+1. */
function reservaInstant(fecha: string, hora: string): Date {
  const [y, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = hora.slice(0, 5).split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d + (hh === 0 ? 1 : 0), hh, mm);
  const first = wall - madridOffsetMin(new Date(wall)) * 60000;
  return new Date(wall - madridOffsetMin(new Date(first)) * 60000);
}

function reservaPeriodo(data: { fecha: string; hora: string }): { start: Date; end: Date } {
  const start = reservaInstant(data.fecha, data.hora);
  return { start, end: new Date(start.getTime() + 2 * 60 * 60 * 1000) };
}

// ── Calendario (.ics y Google Calendar) ────────────────────────
// En UTC: así el evento sale a su hora aunque el móvil del cliente esté en otro país.

const CAL: Record<Lang, { title: string; table: (n: number) => string; phone: string }> = {
  es: { title: `Reserva en ${RESTAURANT_NAME}`, table: (n) => `Mesa para ${n} ${n === 1 ? "persona" : "personas"}`, phone: "Teléfono" },
  ca: { title: `Reserva a ${RESTAURANT_NAME}`,  table: (n) => `Taula per a ${n} ${n === 1 ? "persona" : "persones"}`, phone: "Telèfon" },
  en: { title: `Booking at ${RESTAURANT_NAME}`, table: (n) => `Table for ${n}`, phone: "Phone" },
};

const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);

/** Líneas de 75 octetos como máximo (RFC 5545) */
function icsFold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

function generateICS(data: ReservaEmailData): string {
  const L = lang(data.idioma);
  const { start, end } = reservaPeriodo(data);
  const now = new Date();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${RESTAURANT_NAME}//Reservas//${L.toUpperCase()}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Mismo UID para la misma reserva: si cambia la hora, el calendario actualiza el evento en vez de duplicarlo
    `UID:${data.id ?? data.cancel_token}@reservas.cortedemanga.es`,
    `SEQUENCE:${Math.floor(now.getTime() / 1000)}`,
    `DTSTAMP:${icsStamp(now)}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsText(CAL[L].title)}`,
    `DESCRIPTION:${icsText(`${CAL[L].table(data.personas)} · ${CAL[L].phone} ${PHONE_DISPLAY}`)}`,
    `LOCATION:${icsText(`${RESTAURANT_NAME}, ${ADDRESS_PLAIN}`)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].map(icsFold).join("\r\n") + "\r\n";
}

function generateGoogleCalendarLink(data: ReservaEmailData): string {
  const L = lang(data.idioma);
  const { start, end } = reservaPeriodo(data);
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: CAL[L].title,
    dates: `${icsStamp(start)}/${icsStamp(end)}`,
    ctz: "Europe/Madrid",
    details: `${CAL[L].table(data.personas)} · ${CAL[L].phone} ${PHONE_DISPLAY}`,
    location: `${RESTAURANT_NAME}, ${ADDRESS_PLAIN}`,
  })}`;
}

const icsAttachment = (data: ReservaEmailData) => ({
  filename: "reserva.ics",
  content: Buffer.from(generateICS(data)).toString("base64"),
  contentType: "text/calendar; charset=utf-8",
});

// ── Diseño (el de cortedemanga.es: verde, crema y ocre; líneas de costura) ──

const C = {
  page: "#F3ECDF", panel: "#FBF7F0", tint: "#E9DFCB",
  fg: "#1E3A2B", soft: "#4C5E52", acc: "#86562A", line: "#9A6532", rule: "#D3BF9C",
  band: "#1E3A2B", bandFg: "#F3ECDF", bandSoft: "#D6CBB5", bandAcc: "#C8955A",
  pend: "#C8955A", err: "#B5442F",
} as const;
// La letra de la web no se puede cargar en Gmail: Arial es la más parecida que tienen todos
const FONT = "'Atkinson Hyperlegible Next','Atkinson Hyperlegible',Arial,Helvetica,sans-serif";
const f = (css: string) => `font-family:${FONT};${css}`;

function eyebrow(text: string, color: string = C.acc): string {
  return `<p style="${f(`margin:0 0 10px;font-size:13px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${color}`)}">${text}</p>`;
}

function heading(text: string): string {
  return `<h1 style="${f(`margin:0 0 14px;font-size:30px;font-weight:800;line-height:1.15;color:${C.fg}`)}">${text}</h1>`;
}

function lead(text: string): string {
  return `<p style="${f(`margin:0 0 26px;font-size:17px;line-height:1.55;color:${C.soft}`)}">${text}</p>`;
}

function detalleCard(rows: [string, string][], marginBottom = "28px"): string {
  const trs = rows.map(([label, value], i) => {
    const sep = i > 0 ? `border-top:1px dashed ${C.rule};` : "";
    return `
        <tr>
          <td style="${f(`padding:13px 12px 13px 0;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.soft};vertical-align:top;${sep}`)}">${label}</td>
          <td style="${f(`padding:13px 0;font-size:16px;font-weight:700;line-height:1.4;color:${C.fg};text-align:right;vertical-align:top;${sep}`)}">${value}</td>
        </tr>`;
  }).join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}" style="margin:0 0 ${marginBottom};background-color:${C.panel};border:1px dashed ${C.line}">
      <tr><td style="padding:4px 18px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${trs}
        </table>
      </td></tr>
    </table>`;
}

function button(href: string, label: string, variant: "solid" | "outline" = "solid"): string {
  const solid = variant === "solid";
  const cell = solid ? `background-color:${C.band};border:2px solid ${C.band}` : `border:2px solid ${C.fg}`;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px">
      <tr><td${solid ? ` bgcolor="${C.band}"` : ""} style="${cell}">
        <a href="${href}" style="${f(`display:inline-block;padding:14px 26px;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${solid ? C.bandFg : C.fg};text-decoration:none`)}">${label}</a>
      </td></tr>
    </table>`;
}

function textLinks(links: [string, string][]): string {
  return `
    <p style="${f(`margin:0 0 10px;font-size:15px;line-height:2;color:${C.soft}`)}">${links
      .map(([href, label]) => `<a href="${href}" style="color:${C.acc};font-weight:700;text-decoration:underline">${label}</a>`)
      .join("&nbsp;&nbsp;·&nbsp;&nbsp;")}</p>`;
}

function notice(text: string, color: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px">
      <tr><td bgcolor="${C.tint}" style="border-left:4px solid ${color};background-color:${C.tint};padding:14px 16px">
        <p style="${f(`margin:0;font-size:15px;line-height:1.55;color:${C.fg}`)}">${text}</p>
      </td></tr>
    </table>`;
}

function callLine(label: string): string {
  return `
    <p style="${f(`margin:0 0 24px;font-size:15px;line-height:1.6;color:${C.soft}`)}">${label}&nbsp;
      <a href="${telHref(RESTAURANT_PHONE)}" style="color:${C.fg};font-weight:700;text-decoration:none;white-space:nowrap">${PHONE_DISPLAY}</a></p>`;
}

const FOOT: Record<Lang, { wa: string; web: string; menu: string; reply: string }> = {
  ca: { wa: "WhatsApp (només missatges)", web: "La web", menu: "La carta", reply: "Pots respondre aquest correu si necessites alguna cosa." },
  es: { wa: "WhatsApp (solo mensajes)",   web: "La web", menu: "La carta", reply: "Puedes responder a este correo si necesitas algo." },
  en: { wa: "WhatsApp (messages only)",   web: "Website", menu: "Menu",    reply: "Just reply to this email if you need anything." },
};

function layout(body: string, preview: string, idioma: string): string {
  const L = lang(idioma);
  const ft = FOOT[L];
  const footLink = `color:${C.bandFg};text-decoration:underline`;
  return `<!DOCTYPE html>
<html lang="${L}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${RESTAURANT_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.page}">

  <!--preview-->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preview}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background-color:${C.page}">
    <tr><td align="center" style="padding:0">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">

        <!--cabecera: la franja verde de la web con el logo y la línea de corte-->
        <tr>
          <td bgcolor="${C.band}" style="background-color:${C.band};padding:16px 24px 12px">
            <a href="${SITE.web}${L}/" style="text-decoration:none"><img src="${LOGO_URL}" width="84" height="60" alt="${RESTAURANT_NAME}" style="display:block;border:0;outline:none;${f(`font-size:20px;font-weight:800;color:${C.bandAcc}`)}"></a>
          </td>
        </tr>
        <tr>
          <td bgcolor="${C.band}" style="background-color:${C.band};padding:0 24px 18px">
            <div style="border-top:1px dashed ${C.bandAcc};height:0;line-height:0;font-size:0">&nbsp;</div>
          </td>
        </tr>

        <!--contenido-->
        <tr>
          <td style="padding:32px 24px 8px;background-color:${C.page}">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:6px 24px 28px;background-color:${C.page}">
            <p style="${f(`margin:0;font-size:14px;line-height:1.5;color:${C.soft}`)}">${ft.reply}</p>
          </td>
        </tr>

        <!--pie-->
        <tr>
          <td bgcolor="${C.band}" style="background-color:${C.band};padding:22px 24px 26px">
            <p style="${f(`margin:0 0 6px;font-size:15px;font-weight:700;color:${C.bandFg}`)}">${RESTAURANT_NAME}</p>
            <p style="${f(`margin:0 0 10px;font-size:14px;line-height:1.6;color:${C.bandSoft}`)}"><a href="${SITE.maps}" style="color:${C.bandSoft};text-decoration:none">${ADDRESS_LINE}</a></p>
            <p style="${f(`margin:0 0 2px;font-size:14px;line-height:1.9;color:${C.bandFg}`)}"><a href="${telHref(RESTAURANT_PHONE)}" style="${footLink};white-space:nowrap">${PHONE_DISPLAY}</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${waLink()}" style="${footLink}">${ft.wa}</a></p>
            <p style="${f(`margin:0;font-size:14px;line-height:1.9;color:${C.bandFg}`)}"><a href="${SITE.web}${L}/" style="${footLink}">${ft.web}</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${SITE.carta}${L}/" style="${footLink}">${ft.menu}</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${SITE.instagram}" style="${footLink}">Instagram</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Textos sueltos (versión de solo texto y avisos) ────────────

const PT: Record<Lang, {
  pers: string; change: string; cancel: string; confirm: string; reminder: string;
  changed: string; requested: string; willAnswer: string; rejected: string; cancelled: string; newBooking: string;
}> = {
  es: {
    pers: "pers.", change: "Cambiar fecha u hora", cancel: "Cancelar", confirm: "Confirmo mi asistencia", reminder: "Recordatorio",
    changed: "Reserva cambiada: los enlaces del correo anterior ya no sirven.",
    requested: "Solicitud recibida", willAnswer: "Te contestaremos en las próximas horas.",
    rejected: "Lo sentimos, no podemos confirmar tu solicitud. Prueba con otra fecha o llámanos.",
    cancelled: "Tu reserva está cancelada. ¡Hasta pronto!", newBooking: "Nueva reserva",
  },
  ca: {
    pers: "pers.", change: "Canviar data o hora", cancel: "Cancel·lar", confirm: "Confirmo la meva assistència", reminder: "Recordatori",
    changed: "Reserva canviada: els enllaços del correu anterior ja no funcionen.",
    requested: "Sol·licitud rebuda", willAnswer: "Et respondrem en les properes hores.",
    rejected: "Ho sentim, no podem confirmar la teva sol·licitud. Prova amb una altra data o truca'ns.",
    cancelled: "La teva reserva està cancel·lada. Fins aviat!", newBooking: "Nova reserva",
  },
  en: {
    pers: "guests", change: "Change date or time", cancel: "Cancel", confirm: "Confirm attendance", reminder: "Reminder",
    changed: "Booking changed: links in the previous email no longer work.",
    requested: "Request received", willAnswer: "We'll get back to you within the next few hours.",
    rejected: "Sorry, we can't confirm your request. Try another date or give us a call.",
    cancelled: "Your booking is cancelled. Hope to see you soon!", newBooking: "New booking",
  },
};

function plainSummary(data: { fecha: string; hora: string; personas: number; idioma: string }): string {
  const L = lang(data.idioma);
  return `${cap(formatFechaEmail(data.fecha, data.idioma))} · ${horaLabel(data.fecha, data.hora, data.idioma)} · ${data.personas} ${PT[L].pers}`;
}

const plainContact = () => `${ADDRESS_PLAIN}\n${PHONE_DISPLAY}`;

// ── Email 1: Confirmación (también tras un cambio de fecha u hora) ──

function confirmationHtml(data: ReservaEmailData, cambio = false): string {
  const L = lang(data.idioma);
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = horaLabel(data.fecha, data.hora, data.idioma);
  const shortHora   = data.hora.slice(0, 5);
  const cancelUrl   = `${APP_URL}/${L}/cancelar/${data.cancel_token}`;
  const modifyUrl   = `${APP_URL}/${L}/modificar/${data.cancel_token}`;
  const calendarUrl = generateGoogleCalendarLink(data);

  const t: Record<Lang, Record<string, string>> = {
    es: {
      eyebrow:  cambio ? "Cambio confirmado" : "Mesa confirmada",
      heading:  "Te esperamos.",
      sub:      cambio ? `Hola ${data.nombre}, hemos cambiado tu reserva. Estos son los datos nuevos.` : `Hola ${data.nombre}, tu reserva está confirmada. Nos alegra tenerte.`,
      old:      "Los enlaces del correo anterior ya no sirven: usa los de este.",
      date:     "Fecha",
      time:     "Hora",
      guests:   "Personas",
      address:  "Dónde",
      cal_btn:  "Añadir al calendario",
      maps:     "Cómo llegar",
      modify:   "Cambiar fecha u hora",
      cancel:   "Cancelar reserva",
      preview:  `Te esperamos — ${displayDate} a las ${shortHora}`,
    },
    ca: {
      eyebrow:  cambio ? "Canvi confirmat" : "Taula confirmada",
      heading:  "T'esperem.",
      sub:      cambio ? `Hola ${data.nombre}, hem canviat la teva reserva. Aquestes són les dades noves.` : `Hola ${data.nombre}, la teva reserva està confirmada. Ens alegra tenir-te.`,
      old:      "Els enllaços del correu anterior ja no funcionen: fes servir els d'aquest.",
      date:     "Data",
      time:     "Hora",
      guests:   "Persones",
      address:  "On",
      cal_btn:  "Afegir al calendari",
      maps:     "Com arribar",
      modify:   "Canviar data o hora",
      cancel:   "Cancel·lar reserva",
      preview:  `T'esperem — ${displayDate} a les ${shortHora}`,
    },
    en: {
      eyebrow:  cambio ? "Change confirmed" : "Table confirmed",
      heading:  "See you soon.",
      sub:      cambio ? `Hi ${data.nombre}, your booking has been changed. Here are the new details.` : `Hi ${data.nombre}, your booking is confirmed. We're glad to have you.`,
      old:      "Links in the previous email no longer work: use the ones in this one.",
      date:     "Date",
      time:     "Time",
      guests:   "Guests",
      address:  "Where",
      cal_btn:  "Add to calendar",
      maps:     "Get directions",
      modify:   "Change date or time",
      cancel:   "Cancel booking",
      preview:  `See you soon — ${displayDate} at ${shortHora}`,
    },
  };
  const tx = t[L];

  const body = `
    ${eyebrow(tx.eyebrow)}
    ${heading(tx.heading)}
    ${lead(tx.sub)}
    ${cambio ? notice(tx.old, C.line) : ""}
    ${detalleCard([
      [tx.date,    cap(displayDate)],
      [tx.time,    displayHora],
      [tx.guests,  `${data.personas}`],
      [tx.address, ADDRESS_LINE],
    ])}
    ${button(calendarUrl, tx.cal_btn)}
    ${textLinks([[SITE.maps, tx.maps]])}
    ${textLinks([[modifyUrl, tx.modify], [cancelUrl, tx.cancel]])}`;

  return layout(body, tx.preview, data.idioma);
}

// ── Email 2: Solicitud pendiente ───────────────────────────────

function pendingHtml(data: ReservaEmailData): string {
  const L = lang(data.idioma);
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = horaLabel(data.fecha, data.hora, data.idioma);

  const t: Record<Lang, Record<string, string>> = {
    es: {
      eyebrow:  "Solicitud recibida",
      heading:  "En breve te confirmamos.",
      sub:      `Hola ${data.nombre}, hemos recibido tu solicitud para ${data.personas} personas.`,
      notice:   "Los grupos grandes requieren confirmación manual. Te escribiremos en las próximas horas con la respuesta definitiva.",
      date:     "Fecha solicitada",
      time:     "Hora",
      guests:   "Personas",
      call:     "¿Urgente? Llámanos:",
      preview:  `Hemos recibido tu solicitud para el ${displayDate}. Te confirmamos pronto.`,
    },
    ca: {
      eyebrow:  "Sol·licitud rebuda",
      heading:  "En breu et confirmem.",
      sub:      `Hola ${data.nombre}, hem rebut la teva sol·licitud per a ${data.personas} persones.`,
      notice:   "Els grups grans requereixen confirmació manual. T'escriurem en les properes hores amb la resposta definitiva.",
      date:     "Data sol·licitada",
      time:     "Hora",
      guests:   "Persones",
      call:     "Urgent? Truca'ns:",
      preview:  `Hem rebut la teva sol·licitud per al ${displayDate}. Et confirmem aviat.`,
    },
    en: {
      eyebrow:  "Request received",
      heading:  "We'll confirm shortly.",
      sub:      `Hi ${data.nombre}, we've received your request for ${data.personas} guests.`,
      notice:   "Large groups require manual confirmation. We'll email you within the next few hours with a definitive answer.",
      date:     "Requested date",
      time:     "Time",
      guests:   "Guests",
      call:     "Urgent? Call us:",
      preview:  `We've received your request for ${displayDate}. Confirmation coming soon.`,
    },
  };
  const tx = t[L];

  const body = `
    ${eyebrow(tx.eyebrow)}
    ${heading(tx.heading)}
    ${lead(tx.sub)}
    ${detalleCard([
      [tx.date,   cap(displayDate)],
      [tx.time,   displayHora],
      [tx.guests, `${data.personas}`],
    ])}
    ${notice(tx.notice, C.pend)}
    ${callLine(tx.call)}`;

  return layout(body, tx.preview, data.idioma);
}

// ── Email 3: Cancelación ───────────────────────────────────────

function cancellationHtml(data: ReservaEmailData): string {
  const L = lang(data.idioma);
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = horaLabel(data.fecha, data.hora, data.idioma);
  const bookUrl     = `${APP_URL}/${L}`;

  const t: Record<Lang, Record<string, string>> = {
    es: {
      eyebrow:  "Reserva cancelada",
      heading:  "Hasta la próxima.",
      sub:      `Hola ${data.nombre}, tu reserva ha sido cancelada. Esperamos verte pronto.`,
      date:     "Fecha",
      time:     "Hora",
      guests:   "Personas",
      rebook:   "Nueva reserva",
      preview:  `Tu reserva del ${displayDate} ha sido cancelada. Hasta pronto.`,
    },
    ca: {
      eyebrow:  "Reserva cancel·lada",
      heading:  "Fins aviat.",
      sub:      `Hola ${data.nombre}, la teva reserva ha estat cancel·lada. Esperem veure't aviat.`,
      date:     "Data",
      time:     "Hora",
      guests:   "Persones",
      rebook:   "Nova reserva",
      preview:  `La teva reserva del ${displayDate} ha estat cancel·lada. Fins aviat.`,
    },
    en: {
      eyebrow:  "Booking cancelled",
      heading:  "Until next time.",
      sub:      `Hi ${data.nombre}, your booking has been cancelled. Hope to see you soon.`,
      date:     "Date",
      time:     "Time",
      guests:   "Guests",
      rebook:   "New booking",
      preview:  `Your booking on ${displayDate} has been cancelled. Until next time.`,
    },
  };
  const tx = t[L];

  const body = `
    ${eyebrow(tx.eyebrow)}
    ${heading(tx.heading)}
    ${lead(tx.sub)}
    ${detalleCard([
      [tx.date,   cap(displayDate)],
      [tx.time,   displayHora],
      [tx.guests, `${data.personas}`],
    ], "32px")}
    ${button(bookUrl, tx.rebook, "outline")}`;

  return layout(body, tx.preview, data.idioma);
}

// ── Email 4: Rechazo ──────────────────────────────────────────

function rejectionHtml(data: Omit<ReservaEmailData, "cancel_token">): string {
  const L = lang(data.idioma);
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = data.hora.slice(0, 5);
  const shortDate   = formatShortDate(data.fecha, data.idioma);
  const bookUrl     = `${APP_URL}/${L}`;

  const t: Record<Lang, Record<string, string>> = {
    es: {
      eyebrow:  "Solicitud no disponible",
      heading:  "Lo sentimos.",
      sub:      `Hola ${data.nombre}, lamentablemente no podemos confirmar tu solicitud para ${data.personas} personas el ${displayDate} a las ${displayHora}.`,
      notice:   "En estas fechas no tenemos disponibilidad para grupos de este tamaño. Te invitamos a intentarlo con otra fecha o a llamarnos directamente.",
      call:     "¿Hablamos?",
      rebook:   "Intentar otra fecha",
      preview:  `Sobre tu solicitud del ${shortDate} — hay alternativas disponibles.`,
    },
    ca: {
      eyebrow:  "Sol·licitud no disponible",
      heading:  "Ho sentim.",
      sub:      `Hola ${data.nombre}, lamentablement no podem confirmar la teva sol·licitud per a ${data.personas} persones el ${displayDate} a les ${displayHora}.`,
      notice:   "En aquestes dates no tenim disponibilitat per a grups d'aquesta mida. T'invitem a intentar-ho amb una altra data o a trucar-nos directament.",
      call:     "Parlem?",
      rebook:   "Intentar una altra data",
      preview:  `Sobre la teva sol·licitud del ${shortDate} — hi ha alternatives disponibles.`,
    },
    en: {
      eyebrow:  "Request unavailable",
      heading:  "We're sorry.",
      sub:      `Hi ${data.nombre}, unfortunately we cannot confirm your request for ${data.personas} guests on ${displayDate} at ${displayHora}.`,
      notice:   "We don't have availability for groups of this size on those dates. We invite you to try another date or give us a call.",
      call:     "Shall we talk?",
      rebook:   "Try another date",
      preview:  `About your request for ${shortDate} — other dates are available.`,
    },
  };
  const tx = t[L];

  const body = `
    ${eyebrow(tx.eyebrow, C.err)}
    ${heading(tx.heading)}
    ${lead(tx.sub)}
    ${notice(tx.notice, C.err)}
    ${callLine(tx.call)}
    ${button(bookUrl, tx.rebook, "outline")}`;

  return layout(body, tx.preview, data.idioma);
}

// ── Envíos ─────────────────────────────────────────────────────

export async function sendConfirmationEmail(data: ReservaEmailData, opts: { cambio?: boolean } = {}) {
  const L = lang(data.idioma);
  const cambio = Boolean(opts.cambio);
  const hora = data.hora.slice(0, 5);
  const subjects: Record<Lang, string> = cambio
    ? {
        es: `Reserva cambiada — ${hora} · ${formatShortDate(data.fecha, "es")}`,
        ca: `Reserva canviada — ${hora} · ${formatShortDate(data.fecha, "ca")}`,
        en: `Booking changed — ${formatShortDate(data.fecha, "en")} at ${hora}`,
      }
    : {
        es: `Tu mesa está confirmada — ${hora} · ${formatShortDate(data.fecha, "es")}`,
        ca: `La teva taula està confirmada — ${hora} · ${formatShortDate(data.fecha, "ca")}`,
        en: `Your table is confirmed — ${formatShortDate(data.fecha, "en")} at ${hora}`,
      };
  const cancelUrl = `${APP_URL}/${L}/cancelar/${data.cancel_token}`;
  const modifyUrl = `${APP_URL}/${L}/modificar/${data.cancel_token}`;
  const text = [
    RESTAURANT_NAME,
    "",
    plainSummary(data),
    ...(cambio ? [PT[L].changed] : []),
    "",
    plainContact(),
    "",
    `${PT[L].change}: ${modifyUrl}`,
    `${PT[L].cancel}: ${cancelUrl}`,
  ].join("\n");
  await sendEmail({
    from: FROM,
    to: data.email,
    subject: subjects[L],
    html: confirmationHtml(data, cambio),
    text,
    attachments: [icsAttachment(data)],
  });
}

export async function sendPendingEmail(data: ReservaEmailData) {
  const L = lang(data.idioma);
  const subjects: Record<Lang, string> = {
    es: `Revisando tu solicitud — te avisamos pronto`,
    ca: `Revisant la teva sol·licitud — t'avisem aviat`,
    en: `We've received your request — confirmation coming soon`,
  };
  const text = `${RESTAURANT_NAME}\n\n${PT[L].requested}: ${plainSummary(data)}\n\n${PT[L].willAnswer}\n\n${PHONE_DISPLAY}`;
  await sendEmail({
    from: FROM,
    to: data.email,
    subject: subjects[L],
    html: pendingHtml(data),
    text,
  });
}

export async function sendRejectionEmail(data: Omit<ReservaEmailData, "cancel_token">) {
  const L = lang(data.idioma);
  const shortDate = formatShortDate(data.fecha, data.idioma);
  const subjects: Record<Lang, string> = {
    es: `Sobre tu solicitud para el ${shortDate}`,
    ca: `Sobre la teva sol·licitud per al ${shortDate}`,
    en: `About your request for ${shortDate}`,
  };
  const text = `${RESTAURANT_NAME}\n\n${PT[L].rejected}\n\n${PHONE_DISPLAY}\n${APP_URL}/${L}`;
  await sendEmail({
    from: FROM,
    to: data.email,
    subject: subjects[L],
    html: rejectionHtml(data),
    text,
  });
}

export async function sendCancellationEmail(data: ReservaEmailData) {
  const L = lang(data.idioma);
  const subjects: Record<Lang, string> = {
    es: `Hasta la próxima · ${RESTAURANT_NAME}`,
    ca: `Fins aviat · ${RESTAURANT_NAME}`,
    en: `Until next time · ${RESTAURANT_NAME}`,
  };
  const text = `${RESTAURANT_NAME}\n\n${PT[L].cancelled}\n${plainSummary(data)}\n\n${PT[L].newBooking}: ${APP_URL}/${L}\n${PHONE_DISPLAY}`;
  await sendEmail({
    from: FROM,
    to: data.email,
    subject: subjects[L],
    html: cancellationHtml(data),
    text,
  });
}

// ── Email 5: Recordatorio del día antes + reconfirmación ───────

interface ReminderReconfirmData {
  nombre: string;
  apellido: string;
  email: string;
  fecha: string;
  hora: string;
  personas: number;
  cancel_token: string;
  reconfirmacion_token: string;
  idioma: string;
}

function reminderReconfirmHtml(data: ReminderReconfirmData): string {
  const L = lang(data.idioma);
  const displayDate  = formatFechaEmail(data.fecha, data.idioma);
  const displayHora  = horaLabel(data.fecha, data.hora, data.idioma);
  const shortHora    = data.hora.slice(0, 5);
  const cancelUrl    = `${APP_URL}/${L}/cancelar/${data.cancel_token}`;
  const modifyUrl    = `${APP_URL}/${L}/modificar/${data.cancel_token}`;
  const reconfirmUrl = `${APP_URL}/${L}/reconfirmar?t=${data.reconfirmacion_token}`;

  const t: Record<Lang, Record<string, string>> = {
    es: {
      eyebrow:   "Recordatorio · mañana",
      heading:   "Te esperamos.",
      sub:       `Hola ${data.nombre}, mañana tienes una reserva con nosotros. ¿Confirmas tu asistencia?`,
      date:      "Fecha",
      time:      "Hora",
      guests:    "Personas",
      address:   "Dónde",
      cta:       "Confirmo mi asistencia",
      modify:    "Cambiar fecha u hora",
      cancel:    "Cancelar reserva",
      preview:   `Tu mesa de mañana a las ${shortHora} está reservada — confirma tu asistencia.`,
    },
    ca: {
      eyebrow:   "Recordatori · demà",
      heading:   "T'esperem.",
      sub:       `Hola ${data.nombre}, demà tens una reserva amb nosaltres. Confirmes la teva assistència?`,
      date:      "Data",
      time:      "Hora",
      guests:    "Persones",
      address:   "On",
      cta:       "Confirmo la meva assistència",
      modify:    "Canviar data o hora",
      cancel:    "Cancel·lar reserva",
      preview:   `La teva taula de demà a les ${shortHora} està reservada — confirma la teva assistència.`,
    },
    en: {
      eyebrow:   "Reminder · tomorrow",
      heading:   "See you tomorrow.",
      sub:       `Hi ${data.nombre}, you have a reservation with us tomorrow. Can you confirm your attendance?`,
      date:      "Date",
      time:      "Time",
      guests:    "Guests",
      address:   "Where",
      cta:       "Confirm attendance",
      modify:    "Change date or time",
      cancel:    "Cancel booking",
      preview:   `Your table tomorrow at ${shortHora} is reserved — please confirm your attendance.`,
    },
  };
  const tx = t[L];

  const body = `
    ${eyebrow(tx.eyebrow)}
    ${heading(tx.heading)}
    ${lead(tx.sub)}
    ${detalleCard([
      [tx.date,    cap(displayDate)],
      [tx.time,    displayHora],
      [tx.guests,  `${data.personas}`],
      [tx.address, ADDRESS_LINE],
    ])}
    ${button(reconfirmUrl, tx.cta)}
    ${textLinks([[modifyUrl, tx.modify], [cancelUrl, tx.cancel]])}`;

  return layout(body, tx.preview, data.idioma);
}

export async function sendReminderWithReconfirmacion(data: ReminderReconfirmData): Promise<void> {
  const L = lang(data.idioma);
  const hora = data.hora.slice(0, 5);
  // Madrugada (00:xx): «mañana por la noche», para que nadie lo lea como esta misma noche
  const night = isMadrugada(data.hora);
  const subjects: Record<Lang, string> = {
    es: `${night ? "Mañana por la noche, a las" : "Mañana a las"} ${hora} — ¿confirmamos tu mesa?`,
    ca: `${night ? "Demà a la nit, a les" : "Demà a les"} ${hora} — confirmem la teva taula?`,
    en: `${night ? "Tomorrow night at" : "Tomorrow at"} ${hora} — can we confirm your table?`,
  };
  const cancelUrl    = `${APP_URL}/${L}/cancelar/${data.cancel_token}`;
  const reconfirmUrl = `${APP_URL}/${L}/reconfirmar?t=${data.reconfirmacion_token}`;
  const modifyUrl    = `${APP_URL}/${L}/modificar/${data.cancel_token}`;
  const text = [
    RESTAURANT_NAME,
    "",
    `${PT[L].reminder}: ${plainSummary(data)}`,
    "",
    plainContact(),
    "",
    `${PT[L].confirm}: ${reconfirmUrl}`,
    `${PT[L].change}: ${modifyUrl}`,
    `${PT[L].cancel}: ${cancelUrl}`,
  ].join("\n");
  await sendEmail({
    from: FROM,
    to: data.email,
    subject: subjects[L],
    html: reminderReconfirmHtml(data),
    text,
  });
}

// ── Email 6: Aviso al bar ──────────────────────────────────────

interface ReservaDiaSummary {
  id: string;
  nombre: string;
  apellido: string;
  hora: string;
  personas: number;
  estado: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export async function sendAdminNotification(data: {
  tipo: "nueva_pendiente" | "nueva_confirmada" | "cancelacion" | "modificacion";
  antes?: { fecha: string; hora: string };
  nombre: string;
  apellido: string;
  fecha: string;
  hora: string;
  personas: number;
  telefono?: string;
  email?: string;
  /** Comentarios del cliente (alergias, celebraciones...): texto libre, se escapa */
  notas?: string | null;
  reservasDia?: ReservaDiaSummary[];
  newReservaId?: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const displayDate = formatFechaEmail(data.fecha, "es");
  const displayHora = data.hora.slice(0, 5);
  const notas = data.notas?.trim() ? data.notas.trim().slice(0, 1000) : "";

  const subject =
    data.tipo === "nueva_pendiente"
      ? `🟡 Solicitud pendiente — ${data.nombre} ${data.apellido} · ${displayHora}`
      : data.tipo === "nueva_confirmada"
      ? `🟢 Nueva reserva — ${data.nombre} ${data.apellido} · ${displayHora}`
      : data.tipo === "modificacion"
      ? `🔵 Cambio de reserva — ${data.nombre} ${data.apellido} · ${displayHora}`
      : `🔴 Cancelación — ${data.nombre} ${data.apellido} · ${displayHora}`;

  const tipoBadge =
    data.tipo === "nueva_pendiente"
      ? `<span style="background:#f59e0b;color:#000;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700">PENDIENTE</span>`
      : data.tipo === "nueva_confirmada"
      ? `<span style="background:#10b981;color:#fff;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700">CONFIRMADA</span>`
      : data.tipo === "modificacion"
      ? `<span style="background:#2563eb;color:#fff;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700">CAMBIO</span>`
      : `<span style="background:#ef4444;color:#fff;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700">CANCELACIÓN</span>`;

  const detailRows = [
    ...(data.antes ? [["Antes", `${formatFechaEmail(data.antes.fecha, "es")} · ${data.antes.hora.slice(0, 5)}`]] : []),
    ["Fecha", displayDate],
    ["Hora", displayHora],
    ["Personas", `${data.personas}`],
    ...(notas ? [["Comentarios", `<span style="background:#fefce8;padding:2px 4px">${escapeHtml(notas).replace(/\r?\n/g, "<br>")}</span>`]] : []),
    ...(data.telefono ? [["Teléfono", `<a href="tel:${escapeHtml(data.telefono)}" style="color:#2563eb;text-decoration:none">${escapeHtml(data.telefono)}</a>`]] : []),
    ...(data.email ? [["Email", `<a href="mailto:${escapeHtml(data.email)}" style="color:#2563eb;text-decoration:none">${escapeHtml(data.email)}</a>`]] : []),
  ]
    .map(([label, value]) =>
      `<tr><td style="padding:7px 12px 7px 0;color:#6b7280;font-size:13px;width:80px;vertical-align:top">${label}</td><td style="padding:7px 0;font-size:13px;color:#111;font-weight:600">${value}</td></tr>`
    )
    .join("");

  const panelHref = data.tipo === "nueva_pendiente"
    ? `${APP_URL}/admin/pendientes`
    : `${APP_URL}/admin`;

  const panelLabel = data.tipo === "nueva_pendiente" ? "Ver pendientes →" : "Ir al panel →";

  let scheduleHtml = "";
  if (data.reservasDia && data.reservasDia.length > 0) {
    const STATUS: Record<string, string> = {
      confirmada: "✓",
      llegado: "✓✓",
      pendiente_aprobacion: "⏳",
      no_show: "✗",
    };
    const totalPersonas = data.reservasDia.reduce((s, r) => s + r.personas, 0);

    const scheduleRows = data.reservasDia
      .map((r) => {
        const isNew = r.id === data.newReservaId;
        const rowStyle = isNew ? "background:#fefce8" : "";
        const nameStyle = isNew ? "font-weight:700;color:#92400e" : "color:#374151";
        const newTag = isNew ? `&nbsp;<span style="font-size:11px;font-weight:700;color:#d97706">NUEVA</span>` : "";
        return `<tr style="${rowStyle}">
          <td style="padding:6px 8px 6px 0;font-size:13px;color:#9ca3af;white-space:nowrap">${r.hora.slice(0, 5)}</td>
          <td style="padding:6px 0;font-size:13px;${nameStyle}">${escapeHtml(`${r.nombre} ${r.apellido}`)}${newTag}</td>
          <td style="padding:6px 0 6px 12px;font-size:13px;color:#6b7280;text-align:right;white-space:nowrap">${r.personas}p</td>
          <td style="padding:6px 0 6px 8px;font-size:12px;color:#9ca3af;text-align:right;white-space:nowrap">${STATUS[r.estado] ?? r.estado}</td>
        </tr>`;
      })
      .join("");

    scheduleHtml = `
      <tr><td colspan="4" style="padding:20px 0 0"><hr style="border:none;border-top:1px solid #f3f4f6;margin:0"></td></tr>
      <tr><td colspan="4" style="padding:16px 0 10px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:1px;text-transform:uppercase">
        Reservas del día &middot; ${displayDate}
      </td></tr>
      ${scheduleRows}
      <tr><td colspan="4" style="padding:10px 0 0;font-size:12px;color:#9ca3af">
        ${data.reservasDia.length} reserva${data.reservasDia.length !== 1 ? "s" : ""} &middot; ${totalPersonas} persona${totalPersonas !== 1 ? "s" : ""}
      </td></tr>`;
  }

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f9fafb;padding:24px;margin:0">
<div style="max-width:520px;background:#fff;border-radius:10px;padding:28px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,.05)">
  <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:2px;text-transform:uppercase">${RESTAURANT_NAME}</p>
  <p style="margin:0 0 16px">${tipoBadge}</p>
  <h2 style="margin:0 0 16px;font-size:22px;color:#111;font-weight:700">${escapeHtml(`${data.nombre} ${data.apellido}`)}</h2>
  <table style="width:100%;border-collapse:collapse">
    ${detailRows}
    <tr><td colspan="2" style="padding:16px 0 0">
      <a href="${panelHref}" style="display:inline-block;background:#111827;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">${panelLabel}</a>
    </td></tr>
    ${scheduleHtml}
  </table>
</div>
</body></html>`;

  const text = `${RESTAURANT_NAME} — ${subject}\n\n${data.nombre} ${data.apellido}${data.antes ? `\nAntes: ${formatFechaEmail(data.antes.fecha, "es")} · ${data.antes.hora.slice(0, 5)}` : ""}\nFecha: ${displayDate}\nHora: ${displayHora}\nPersonas: ${data.personas}${notas ? `\nComentarios: ${notas}` : ""}${data.telefono ? `\nTeléfono: ${data.telefono}` : ""}${data.email ? `\nEmail: ${data.email}` : ""}\n\nPanel: ${panelHref}`;

  try {
    await sendEmail({ from: FROM, to: adminEmail, subject, html, text, ...(data.email ? { replyTo: data.email } : {}) });
  } catch (err) {
    console.error("[ADMIN_NOTIFY] Failed:", err);
  }
}

// ── Email 7: Enlace de acceso al panel ─────────────────────────

export async function sendAdminMagicLinkEmail(to: string, magicUrl: string): Promise<void> {
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#111;padding:24px;margin:0">
<div style="max-width:400px;background:#1a1a1a;border-radius:8px;padding:28px;border:1px solid #333;margin:0 auto">
  <p style="color:#b12a2a;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;font-weight:700">${RESTAURANT_NAME.toUpperCase()}</p>
  <h2 style="margin:0 0 12px;font-size:20px;color:#ebebeb">Enlace de acceso al panel</h2>
  <p style="margin:0 0 24px;font-size:14px;color:#9ca3af">Válido durante 15 minutos. Si no lo solicitaste, ignora este email.</p>
  <a href="${magicUrl}" style="display:inline-block;background:#b12a2a;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:700">Acceder al panel →</a>
  <p style="margin:20px 0 0;font-size:12px;color:#6b7280">O copia este enlace en tu navegador:<br><span style="color:#9ca3af;word-break:break-all">${magicUrl}</span></p>
</div>
</body></html>`;

  await sendEmail({
    from: FROM,
    to,
    subject: `Acceso al panel — ${RESTAURANT_NAME}`,
    html,
    text: `Enlace de acceso al panel de ${RESTAURANT_NAME}:\n\n${magicUrl}\n\nVálido 15 minutos.`,
  });
}

// Solo para las pruebas: generan el HTML y el calendario sin enviar nada
export const __emailPreview = {
  confirmationHtml, pendingHtml, cancellationHtml, rejectionHtml, reminderReconfirmHtml,
  generateICS, generateGoogleCalendarLink, reservaInstant,
};
