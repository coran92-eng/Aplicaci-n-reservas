import { Resend } from "resend";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurada");
  return new Resend(key);
}

const FROM           = process.env.RESEND_FROM_EMAIL         ?? "onboarding@resend.dev";
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL       ?? "http://localhost:3000";
const RESTAURANT_NAME    = process.env.RESTAURANT_NAME           ?? "Corte de Manga";
const RESTAURANT_PHONE   = process.env.RESTAURANT_PHONE          ?? "+34 931 234 567";
const RESTAURANT_ADDRESS = process.env.RESTAURANT_ADDRESS        ?? "Comte d'Urgell 108, 08011 Barcelona";
const RESTAURANT_MAPS    = process.env.RESTAURANT_GOOGLE_MAPS_URL ?? "https://maps.google.com";
const RESTAURANT_LOGO    = process.env.RESTAURANT_LOGO_URL       ?? "";

interface ReservaEmailData {
  nombre: string;
  apellido: string;
  email: string;
  fecha: string;
  hora: string;
  personas: number;
  cancel_token: string;
  idioma: string;
}

// ── Helpers ────────────────────────────────────────────────────

function langAttr(idioma: string): string {
  return idioma === "ca" ? "ca" : idioma === "en" ? "en" : "es";
}

function formatFechaEmail(fecha: string, idioma: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const localeMap: Record<string, string> = { es: "es-ES", ca: "ca-ES", en: "en-GB" };
  return new Date(y, m - 1, d).toLocaleDateString(localeMap[idioma] ?? "es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function generateGoogleCalendarLink(data: ReservaEmailData): string {
  const [year, month, day] = data.fecha.split("-").map(Number);
  const [hour, minute] = data.hora.slice(0, 5).split(":").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
  const end   = `${year}${pad(month)}${pad(day)}T${pad(hour + 2)}${pad(minute)}00`;
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: "TEMPLATE",
    text: `Reserva en ${RESTAURANT_NAME}`,
    dates: `${start}/${end}`,
    details: `Reserva para ${data.personas} personas en ${RESTAURANT_NAME}.`,
    location: RESTAURANT_ADDRESS,
  })}`;
}

// ── Layout ─────────────────────────────────────────────────────
// Fondo negro total · Syne + Inter · Sin tarjetas blancas

function layout(body: string, preview: string, idioma: string): string {
  const logoHtml = RESTAURANT_LOGO
    ? `<img src="${RESTAURANT_LOGO}" alt="${RESTAURANT_NAME}" width="140" style="display:block;margin:0 auto 24px;max-height:52px;width:auto">`
    : "";

  return `<!DOCTYPE html>
<html lang="${langAttr(idioma)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${RESTAURANT_NAME}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@300;400;600&display=swap');
    body { margin:0; padding:0; background-color:#050505; }
    .syne { font-family:'Syne','Impact','Arial Black',sans-serif; }
    .inter { font-family:'Inter',-apple-system,'Helvetica Neue',Arial,sans-serif; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#050505">

  <!--preview-->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preview}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#050505">
    <tr><td align="center" style="padding:40px 16px 48px;background-color:#050505">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

        <!--header-->
        <tr>
          <td style="padding:0 0 36px;border-bottom:1px solid #1f1f1f">
            ${logoHtml}
            <p class="inter" style="margin:0 0 6px;font-family:'Inter',-apple-system,sans-serif;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#b12a2a;font-weight:600">${RESTAURANT_NAME.toUpperCase()}</p>
          </td>
        </tr>

        <!--body-->
        <tr>
          <td style="padding:40px 0 0">
            ${body}
          </td>
        </tr>

        <!--footer-->
        <tr>
          <td style="padding:40px 0 0;border-top:1px solid #1f1f1f">
            <p class="inter" style="margin:0;font-family:'Inter',-apple-system,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#444444;line-height:1.8">
              ${RESTAURANT_ADDRESS}
            </p>
            <p style="margin:4px 0 0">
              <a href="tel:${RESTAURANT_PHONE.replace(/\s/g, "")}" class="inter" style="font-family:'Inter',-apple-system,sans-serif;font-size:11px;letter-spacing:1px;color:#444444;text-decoration:none">${RESTAURANT_PHONE}</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Filas de detalle estilo carta ──────────────────────────────

function detalleRows(rows: [string, string][]): string {
  return rows.map(([label, value]) => `
    <tr>
      <td class="inter" style="font-family:'Inter',-apple-system,sans-serif;padding:16px 0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#555555;border-top:1px solid #1a1a1a;vertical-align:middle">${label}</td>
      <td class="inter" style="font-family:'Inter',-apple-system,sans-serif;padding:16px 0;font-size:14px;font-weight:600;color:#ebebeb;text-align:right;border-top:1px solid #1a1a1a;vertical-align:middle">${value}</td>
    </tr>`).join("");
}

// ── Email 1: Confirmación ──────────────────────────────────────

function confirmationHtml(data: ReservaEmailData): string {
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = data.hora.slice(0, 5);
  const cancelUrl   = `${APP_URL}/${data.idioma}/cancelar/${data.cancel_token}`;
  const calendarUrl = generateGoogleCalendarLink(data);

  const t: Record<string, Record<string, string>> = {
    es: {
      eyebrow:  "Mesa confirmada",
      heading:  "Te esperamos.",
      sub:      `Hola ${data.nombre}, tu reserva está confirmada. Nos alegramos de tenerte.`,
      date:     "Fecha",
      time:     "Hora",
      guests:   "Personas",
      address:  "Dónde",
      cal_btn:  "Añadir al calendario",
      maps_btn: "Cómo llegar →",
      cancel:   "Cancelar reserva",
    },
    ca: {
      eyebrow:  "Taula confirmada",
      heading:  "T'esperem.",
      sub:      `Hola ${data.nombre}, la teva reserva està confirmada. Ens alegra tenir-te.`,
      date:     "Data",
      time:     "Hora",
      guests:   "Persones",
      address:  "On",
      cal_btn:  "Afegir al calendari",
      maps_btn: "Com arribar →",
      cancel:   "Cancel·lar reserva",
    },
    en: {
      eyebrow:  "Table confirmed",
      heading:  "See you soon.",
      sub:      `Hi ${data.nombre}, your booking is confirmed. We're glad to have you.`,
      date:     "Date",
      time:     "Time",
      guests:   "Guests",
      address:  "Where",
      cal_btn:  "Add to calendar",
      maps_btn: "Get directions →",
      cancel:   "Cancel booking",
    },
  };
  const tx = t[data.idioma] ?? t.es;

  const body = `
    <!--eyebrow-->
    <p class="inter" style="margin:0 0 12px;font-family:'Inter',-apple-system,sans-serif;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#555555">${tx.eyebrow}</p>

    <!--heading-->
    <h1 class="syne" style="margin:0 0 20px;font-family:'Syne','Impact','Arial Black',sans-serif;font-size:44px;font-weight:800;color:#ebebeb;line-height:1.05;letter-spacing:-1px">${tx.heading}</h1>

    <!--subtext-->
    <p class="inter" style="margin:0 0 36px;font-family:'Inter',-apple-system,sans-serif;font-size:15px;font-weight:300;color:#888888;line-height:1.7">${tx.sub}</p>

    <!--detail rows-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px">
      ${detalleRows([
        [tx.date,    displayDate],
        [tx.time,    displayHora],
        [tx.guests,  `${data.personas}`],
        [tx.address, RESTAURANT_ADDRESS],
      ])}
    </table>

    <!--CTA calendar-->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px">
      <tr>
        <td style="border-radius:2px;background-color:#b12a2a">
          <a href="${calendarUrl}" class="syne"
             style="display:inline-block;font-family:'Syne','Arial Black',sans-serif;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#ebebeb;text-decoration:none;padding:16px 32px">
            ${tx.cal_btn}
          </a>
        </td>
      </tr>
    </table>

    <!--Maps-->
    <p style="margin:0 0 48px">
      <a href="${RESTAURANT_MAPS}" class="inter"
         style="font-family:'Inter',-apple-system,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#555555;text-decoration:none">
        ${tx.maps_btn}
      </a>
    </p>

    <!--cancel-->
    <p style="margin:0">
      <a href="${cancelUrl}" class="inter"
         style="font-family:'Inter',-apple-system,sans-serif;font-size:11px;color:#333333;text-decoration:underline;letter-spacing:1px">
        ${tx.cancel}
      </a>
    </p>`;

  return layout(body, `${displayDate} · ${displayHora} · ${data.personas} pers.`, data.idioma);
}

// ── Email 2: Solicitud pendiente ───────────────────────────────

function pendingHtml(data: ReservaEmailData): string {
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = data.hora.slice(0, 5);

  const t: Record<string, Record<string, string>> = {
    es: {
      eyebrow:  "Solicitud recibida",
      heading:  "En breve te confirmamos.",
      sub:      `Hola ${data.nombre}, hemos recibido tu solicitud para ${data.personas} personas.`,
      notice:   "Los grupos grandes requieren confirmación manual. Te escribiremos en las próximas horas con la respuesta definitiva.",
      date:     "Fecha solicitada",
      time:     "Hora",
      guests:   "Personas",
      call:     "¿Urgente? Llámanos",
    },
    ca: {
      eyebrow:  "Sol·licitud rebuda",
      heading:  "En breu et confirmem.",
      sub:      `Hola ${data.nombre}, hem rebut la teva sol·licitud per a ${data.personas} persones.`,
      notice:   "Els grups grans requereixen confirmació manual. T'escriurem en les properes hores amb la resposta definitiva.",
      date:     "Data sol·licitada",
      time:     "Hora",
      guests:   "Persones",
      call:     "Urgent? Truca'ns",
    },
    en: {
      eyebrow:  "Request received",
      heading:  "We'll confirm shortly.",
      sub:      `Hi ${data.nombre}, we've received your request for ${data.personas} guests.`,
      notice:   "Large groups require manual confirmation. We'll email you within the next few hours with a definitive answer.",
      date:     "Requested date",
      time:     "Time",
      guests:   "Guests",
      call:     "Urgent? Call us",
    },
  };
  const tx = t[data.idioma] ?? t.es;

  const body = `
    <!--eyebrow-->
    <p class="inter" style="margin:0 0 12px;font-family:'Inter',-apple-system,sans-serif;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#c9a84c">${tx.eyebrow}</p>

    <!--heading-->
    <h1 class="syne" style="margin:0 0 20px;font-family:'Syne','Impact','Arial Black',sans-serif;font-size:44px;font-weight:800;color:#ebebeb;line-height:1.05;letter-spacing:-1px">${tx.heading}</h1>

    <!--subtext-->
    <p class="inter" style="margin:0 0 36px;font-family:'Inter',-apple-system,sans-serif;font-size:15px;font-weight:300;color:#888888;line-height:1.7">${tx.sub}</p>

    <!--detail rows-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px">
      ${detalleRows([
        [tx.date,   displayDate],
        [tx.time,   displayHora],
        [tx.guests, `${data.personas}`],
      ])}
    </table>

    <!--notice — left gold border-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px">
      <tr>
        <td width="3" style="background-color:#c9a84c;border-radius:2px">&nbsp;</td>
        <td style="padding:14px 0 14px 20px">
          <p class="inter" style="margin:0;font-family:'Inter',-apple-system,sans-serif;font-size:14px;font-weight:300;color:#888888;line-height:1.7">${tx.notice}</p>
        </td>
      </tr>
    </table>

    <!--call-->
    <p class="inter" style="margin:0;font-family:'Inter',-apple-system,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#444444">
      ${tx.call} &nbsp;
      <a href="tel:${RESTAURANT_PHONE.replace(/\s/g, "")}" style="color:#ebebeb;text-decoration:none;font-weight:600">${RESTAURANT_PHONE}</a>
    </p>`;

  return layout(body, `${data.personas} pers. · ${displayDate} · ${displayHora}`, data.idioma);
}

// ── Email 3: Cancelación ───────────────────────────────────────

function cancellationHtml(data: ReservaEmailData): string {
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = data.hora.slice(0, 5);
  const bookUrl     = `${APP_URL}/${data.idioma}`;

  const t: Record<string, Record<string, string>> = {
    es: {
      eyebrow:  "Reserva cancelada",
      heading:  "Hasta la próxima.",
      sub:      `Hola ${data.nombre}, tu reserva ha sido cancelada. Esperamos verte pronto.`,
      date:     "Fecha",
      time:     "Hora",
      guests:   "Personas",
      rebook:   "Nueva reserva",
    },
    ca: {
      eyebrow:  "Reserva cancel·lada",
      heading:  "Fins aviat.",
      sub:      `Hola ${data.nombre}, la teva reserva ha estat cancel·lada. Esperem veure't aviat.`,
      date:     "Data",
      time:     "Hora",
      guests:   "Persones",
      rebook:   "Nova reserva",
    },
    en: {
      eyebrow:  "Booking cancelled",
      heading:  "Until next time.",
      sub:      `Hi ${data.nombre}, your booking has been cancelled. Hope to see you soon.`,
      date:     "Date",
      time:     "Time",
      guests:   "Guests",
      rebook:   "New booking",
    },
  };
  const tx = t[data.idioma] ?? t.es;

  const body = `
    <!--eyebrow-->
    <p class="inter" style="margin:0 0 12px;font-family:'Inter',-apple-system,sans-serif;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#555555">${tx.eyebrow}</p>

    <!--heading-->
    <h1 class="syne" style="margin:0 0 20px;font-family:'Syne','Impact','Arial Black',sans-serif;font-size:44px;font-weight:800;color:#ebebeb;line-height:1.05;letter-spacing:-1px">${tx.heading}</h1>

    <!--subtext-->
    <p class="inter" style="margin:0 0 36px;font-family:'Inter',-apple-system,sans-serif;font-size:15px;font-weight:300;color:#888888;line-height:1.7">${tx.sub}</p>

    <!--detail rows-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:48px">
      ${detalleRows([
        [tx.date,   displayDate],
        [tx.time,   displayHora],
        [tx.guests, `${data.personas}`],
      ])}
    </table>

    <!--rebook CTA — outlined-->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="border:1px solid #333333;border-radius:2px">
          <a href="${bookUrl}" class="syne"
             style="display:inline-block;font-family:'Syne','Arial Black',sans-serif;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#ebebeb;text-decoration:none;padding:16px 32px">
            ${tx.rebook}
          </a>
        </td>
      </tr>
    </table>`;

  return layout(body, `${displayDate} · ${displayHora}`, data.idioma);
}

// ── Exports ────────────────────────────────────────────────────

export async function sendConfirmationEmail(data: ReservaEmailData) {
  const subjects: Record<string, string> = {
    es: `Reserva confirmada · ${data.hora.slice(0, 5)} · ${formatFechaEmail(data.fecha, "es")}`,
    ca: `Reserva confirmada · ${data.hora.slice(0, 5)} · ${formatFechaEmail(data.fecha, "ca")}`,
    en: `Booking confirmed · ${formatFechaEmail(data.fecha, "en")} at ${data.hora.slice(0, 5)}`,
  };
  await getResend().emails.send({
    from: FROM,
    to: data.email,
    subject: subjects[data.idioma] ?? subjects.es,
    html: confirmationHtml(data),
  });
}

export async function sendPendingEmail(data: ReservaEmailData) {
  const subjects: Record<string, string> = {
    es: `Solicitud recibida · ${RESTAURANT_NAME}`,
    ca: `Sol·licitud rebuda · ${RESTAURANT_NAME}`,
    en: `Request received · ${RESTAURANT_NAME}`,
  };
  await getResend().emails.send({
    from: FROM,
    to: data.email,
    subject: subjects[data.idioma] ?? subjects.es,
    html: pendingHtml(data),
  });
}

export async function sendCancellationEmail(data: ReservaEmailData) {
  const subjects: Record<string, string> = {
    es: `Hasta la próxima · ${RESTAURANT_NAME}`,
    ca: `Fins aviat · ${RESTAURANT_NAME}`,
    en: `Until next time · ${RESTAURANT_NAME}`,
  };
  await getResend().emails.send({
    from: FROM,
    to: data.email,
    subject: subjects[data.idioma] ?? subjects.es,
    html: cancellationHtml(data),
  });
}
