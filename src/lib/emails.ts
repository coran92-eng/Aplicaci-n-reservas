import { Resend } from "resend";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurada");
  return new Resend(key);
}

const FROM           = process.env.RESEND_FROM_EMAIL         ?? "onboarding@resend.dev";
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL       ?? "http://localhost:3000";
const RESTAURANT_NAME    = process.env.RESTAURANT_NAME           ?? "Corte de Manga";
const RESTAURANT_PHONE   = process.env.RESTAURANT_PHONE          ?? "+34 623 216 562";
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

// ── Email 4: Rechazo ──────────────────────────────────────────

function rejectionHtml(data: Omit<ReservaEmailData, "cancel_token">): string {
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = data.hora.slice(0, 5);
  const bookUrl     = `${APP_URL}/${data.idioma}`;

  const t: Record<string, Record<string, string>> = {
    es: {
      eyebrow:  "Solicitud no disponible",
      heading:  "Lo sentimos.",
      sub:      `Hola ${data.nombre}, lamentablemente no podemos confirmar tu solicitud para ${data.personas} personas el ${displayDate} a las ${displayHora}.`,
      notice:   "En estas fechas no tenemos disponibilidad para grupos de este tamaño. Te invitamos a intentarlo con otra fecha o a llamarnos directamente.",
      call:     "¿Hablamos?",
      rebook:   "Intentar otra fecha",
    },
    ca: {
      eyebrow:  "Sol·licitud no disponible",
      heading:  "Ho sentim.",
      sub:      `Hola ${data.nombre}, lamentablement no podem confirmar la teva sol·licitud per a ${data.personas} persones el ${displayDate} a les ${displayHora}.`,
      notice:   "En aquestes dates no tenim disponibilitat per a grups d'aquesta mida. T'invitem a intentar-ho amb una altra data o a trucar-nos directament.",
      call:     "Parlem?",
      rebook:   "Intentar una altra data",
    },
    en: {
      eyebrow:  "Request unavailable",
      heading:  "We're sorry.",
      sub:      `Hi ${data.nombre}, unfortunately we cannot confirm your request for ${data.personas} guests on ${displayDate} at ${displayHora}.`,
      notice:   "We don't have availability for groups of this size on those dates. We invite you to try another date or give us a call.",
      call:     "Shall we talk?",
      rebook:   "Try another date",
    },
  };
  const tx = t[data.idioma] ?? t.es;

  const body = `
    <!--eyebrow-->
    <p class="inter" style="margin:0 0 12px;font-family:'Inter',-apple-system,sans-serif;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#b12a2a">${tx.eyebrow}</p>

    <!--heading-->
    <h1 class="syne" style="margin:0 0 20px;font-family:'Syne','Impact','Arial Black',sans-serif;font-size:44px;font-weight:800;color:#ebebeb;line-height:1.05;letter-spacing:-1px">${tx.heading}</h1>

    <!--subtext-->
    <p class="inter" style="margin:0 0 36px;font-family:'Inter',-apple-system,sans-serif;font-size:15px;font-weight:300;color:#888888;line-height:1.7">${tx.sub}</p>

    <!--notice — left red border-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px">
      <tr>
        <td width="3" style="background-color:#b12a2a;border-radius:2px">&nbsp;</td>
        <td style="padding:14px 0 14px 20px">
          <p class="inter" style="margin:0;font-family:'Inter',-apple-system,sans-serif;font-size:14px;font-weight:300;color:#888888;line-height:1.7">${tx.notice}</p>
        </td>
      </tr>
    </table>

    <!--call-->
    <p class="inter" style="margin:0 0 32px;font-family:'Inter',-apple-system,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#444444">
      ${tx.call} &nbsp;
      <a href="tel:${RESTAURANT_PHONE.replace(/\s/g, "")}" style="color:#ebebeb;text-decoration:none;font-weight:600">${RESTAURANT_PHONE}</a>
    </p>

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

export async function sendRejectionEmail(data: Omit<ReservaEmailData, "cancel_token">) {
  const subjects: Record<string, string> = {
    es: `Tu solicitud · ${RESTAURANT_NAME}`,
    ca: `La teva sol·licitud · ${RESTAURANT_NAME}`,
    en: `Your request · ${RESTAURANT_NAME}`,
  };
  await getResend().emails.send({
    from: FROM,
    to: data.email,
    subject: subjects[data.idioma] ?? subjects.es,
    html: rejectionHtml(data),
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

// ── Email 5: Notificación admin ────────────────────────────────

export async function sendAdminNotification(data: {
  tipo: "nueva_pendiente" | "cancelacion";
  nombre: string;
  apellido: string;
  fecha: string;
  hora: string;
  personas: number;
  telefono?: string;
  email?: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const displayDate = formatFechaEmail(data.fecha, "es");
  const displayHora = data.hora.slice(0, 5);

  const subject =
    data.tipo === "nueva_pendiente"
      ? `Nueva solicitud pendiente — ${data.nombre} ${data.apellido} · ${displayHora}`
      : `Cancelación — ${data.nombre} ${data.apellido} · ${displayHora}`;

  const tipoBadge =
    data.tipo === "nueva_pendiente"
      ? `<span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700">PENDIENTE</span>`
      : `<span style="background:#ef4444;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700">CANCELACIÓN</span>`;

  const rows = [
    ["Fecha", displayDate],
    ["Hora", displayHora],
    ["Personas", `${data.personas}`],
    ...(data.telefono ? [["Teléfono", `<a href="tel:${data.telefono}">${data.telefono}</a>`]] : []),
    ...(data.email ? [["Email", `<a href="mailto:${data.email}">${data.email}</a>`]] : []),
  ]
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;width:90px">${label}</td><td style="padding:6px 0;font-weight:600;font-size:14px">${value}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px;margin:0">
<div style="max-width:480px;background:#fff;border-radius:8px;padding:24px;border:1px solid #e5e7eb">
  <p style="margin:0 0 16px">${tipoBadge}</p>
  <h2 style="margin:0 0 16px;font-size:20px;color:#111">${data.nombre} ${data.apellido}</h2>
  <table style="width:100%;border-collapse:collapse">${rows}</table>
  <div style="margin-top:24px">
    <a href="${APP_URL}/admin" style="background:#111827;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">Ir al panel →</a>
  </div>
</div>
</body></html>`;

  try {
    await getResend().emails.send({ from: FROM, to: adminEmail, subject, html });
  } catch (err) {
    console.error("[ADMIN_NOTIFY] Failed:", err);
  }
}
