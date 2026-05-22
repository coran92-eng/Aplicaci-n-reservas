import { Resend } from "resend";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurada");
  return new Resend(key);
}

const FROM           = process.env.RESEND_FROM_EMAIL        ?? "onboarding@resend.dev";
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL      ?? "http://localhost:3000";
const RESTAURANT_NAME    = process.env.RESTAURANT_NAME          ?? "Corte de Manga";
const RESTAURANT_PHONE   = process.env.RESTAURANT_PHONE         ?? "+34 931 234 567";
const RESTAURANT_ADDRESS = process.env.RESTAURANT_ADDRESS       ?? "Comte d'Urgell 108, 08011 Barcelona";
const RESTAURANT_MAPS    = process.env.RESTAURANT_GOOGLE_MAPS_URL ?? "https://maps.google.com";
const RESTAURANT_LOGO    = process.env.RESTAURANT_LOGO_URL      ?? "";

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

// ── Layout compartido ──────────────────────────────────────────

function layout(body: string, preview: string, idioma: string): string {
  const headerContent = RESTAURANT_LOGO
    ? `<img src="${RESTAURANT_LOGO}" alt="${RESTAURANT_NAME}" width="160" style="display:block;margin:0 auto;max-height:60px;width:auto">`
    : `<p style="margin:0 0 10px;color:#b12a2a;font-size:10px;letter-spacing:5px;text-transform:uppercase;font-weight:600">Restaurante</p>
       <p style="margin:0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;letter-spacing:4px">${RESTAURANT_NAME}</p>`;

  return `<!DOCTYPE html>
<html lang="${langAttr(idioma)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${RESTAURANT_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0eeec;-webkit-font-smoothing:antialiased;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

  <!--preview text-->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preview}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0eeec">
    <tr><td align="center" style="padding:40px 16px 48px">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px">

        <!--header-->
        <tr>
          <td style="background-color:#0a0a0a;border-radius:14px 14px 0 0;padding:40px 32px;text-align:center">
            ${headerContent}
          </td>
        </tr>

        <!--body-->
        <tr>
          <td style="background-color:#ffffff;padding:44px 40px 36px">
            ${body}
          </td>
        </tr>

        <!--footer-->
        <tr>
          <td style="background-color:#111111;border-radius:0 0 14px 14px;padding:28px 32px;text-align:center">
            <p style="margin:0;color:#666666;font-size:12px;line-height:1.7">
              ${RESTAURANT_NAME} &nbsp;·&nbsp; ${RESTAURANT_ADDRESS}
            </p>
            <p style="margin:6px 0 0">
              <a href="tel:${RESTAURANT_PHONE.replace(/\s/g, "")}" style="color:#888888;text-decoration:none;font-size:12px">${RESTAURANT_PHONE}</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

// ── Detalle card compartido ────────────────────────────────────

function detallesCard(rows: [string, string][]): string {
  const rowsHtml = rows.map(([label, value], i) => {
    const isLast = i === rows.length - 1;
    return `
      <tr>
        <td style="padding:13px 18px;font-size:13px;color:#888888;${isLast ? "" : "border-bottom:1px solid #f0f0f0"}">${label}</td>
        <td style="padding:13px 18px;font-size:14px;font-weight:600;color:#0a0a0a;text-align:right;${isLast ? "" : "border-bottom:1px solid #f0f0f0"}">${value}</td>
      </tr>`;
  }).join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border:1px solid #ebebeb;border-radius:10px;overflow:hidden;margin:28px 0">
      ${rowsHtml}
    </table>`;
}

// ── Email 1: Confirmación ──────────────────────────────────────

function confirmationHtml(data: ReservaEmailData): string {
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = data.hora.slice(0, 5);
  const cancelUrl   = `${APP_URL}/${data.idioma}/cancelar/${data.cancel_token}`;
  const calendarUrl = generateGoogleCalendarLink(data);

  const t: Record<string, Record<string, string>> = {
    es: {
      heading:      "¡Reserva confirmada!",
      intro:        `Hola <strong>${data.nombre}</strong>, tu mesa está reservada. Te esperamos con las mesas listas.`,
      date:         "Fecha",
      time:         "Hora",
      guests:       "Personas",
      address:      "Dónde",
      calendar_btn: "Añadir al calendario",
      maps_btn:     "Cómo llegar",
      cancel:       "Si necesitas cancelar tu reserva, puedes hacerlo desde aquí.",
      cancel_link:  "Cancelar reserva",
    },
    ca: {
      heading:      "Reserva confirmada!",
      intro:        `Hola <strong>${data.nombre}</strong>, la teva taula està reservada. T'esperem amb les taules a punt.`,
      date:         "Data",
      time:         "Hora",
      guests:       "Persones",
      address:      "On",
      calendar_btn: "Afegir al calendari",
      maps_btn:     "Com arribar",
      cancel:       "Si necessites cancel·lar la reserva, pots fer-ho des d'aquí.",
      cancel_link:  "Cancel·lar reserva",
    },
    en: {
      heading:      "Booking confirmed!",
      intro:        `Hi <strong>${data.nombre}</strong>, your table is booked. We'll have everything ready for you.`,
      date:         "Date",
      time:         "Time",
      guests:       "Guests",
      address:      "Where",
      calendar_btn: "Add to calendar",
      maps_btn:     "Get directions",
      cancel:       "If you need to cancel your booking, you can do so here.",
      cancel_link:  "Cancel booking",
    },
  };

  const tx = t[data.idioma] ?? t.es;

  const body = `
    <!--check icon-->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;background-color:#f0fdf4;border-radius:50%;border:2px solid #bbf7d0">
        <span style="color:#16a34a;font-size:26px;line-height:1">✓</span>
      </div>
    </div>

    <h1 style="margin:0 0 12px;font-size:22px;color:#0a0a0a;font-weight:700;text-align:center">${tx.heading}</h1>
    <p style="margin:0 0 4px;font-size:15px;color:#555555;line-height:1.7;text-align:center">${tx.intro}</p>

    ${detallesCard([
      [tx.date,    displayDate],
      [tx.time,    displayHora],
      [tx.guests,  `${data.personas}`],
      [tx.address, RESTAURANT_ADDRESS],
    ])}

    <!--CTA calendar-->
    <div style="text-align:center;margin:28px 0 16px">
      <a href="${calendarUrl}"
         style="display:inline-block;background-color:#b12a2a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.3px">
        📅 ${tx.calendar_btn}
      </a>
    </div>

    <!--Maps link-->
    <div style="text-align:center;margin-bottom:36px">
      <a href="${RESTAURANT_MAPS}"
         style="color:#888888;font-size:13px;text-decoration:none">
        📍 ${tx.maps_btn}
      </a>
    </div>

    <!--Divider-->
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 24px">

    <!--Cancel-->
    <p style="margin:0;font-size:13px;color:#aaaaaa;text-align:center;line-height:1.6">
      ${tx.cancel}<br>
      <a href="${cancelUrl}" style="color:#aaaaaa;font-size:12px;text-decoration:underline">${tx.cancel_link}</a>
    </p>`;

  return layout(body, `${displayDate} · ${displayHora} · ${data.personas} pers.`, data.idioma);
}

// ── Email 2: Solicitud pendiente ───────────────────────────────

function pendingHtml(data: ReservaEmailData): string {
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = data.hora.slice(0, 5);

  const t: Record<string, Record<string, string>> = {
    es: {
      heading:   "Solicitud recibida",
      intro:     `Hola <strong>${data.nombre}</strong>, hemos recibido tu solicitud de reserva para grupo.`,
      notice:    `Los grupos a partir de ${data.personas} personas requieren confirmación por nuestra parte. Te escribiremos en las próximas horas con la confirmación definitiva.`,
      date:      "Fecha solicitada",
      time:      "Hora",
      guests:    "Personas",
      questions: "¿Tienes alguna pregunta urgente?",
      call:      `Llámanos al`,
    },
    ca: {
      heading:   "Sol·licitud rebuda",
      intro:     `Hola <strong>${data.nombre}</strong>, hem rebut la teva sol·licitud de reserva per a grup.`,
      notice:    `Els grups a partir de ${data.personas} persones requereixen confirmació per la nostra part. T'escriurem en les properes hores amb la confirmació definitiva.`,
      date:      "Data sol·licitada",
      time:      "Hora",
      guests:    "Persones",
      questions: "Tens alguna pregunta urgent?",
      call:      `Truca'ns al`,
    },
    en: {
      heading:   "Request received",
      intro:     `Hi <strong>${data.nombre}</strong>, we've received your group booking request.`,
      notice:    `Groups of ${data.personas} or more guests require confirmation from our side. We'll email you within the next few hours with a final confirmation.`,
      date:      "Requested date",
      time:      "Time",
      guests:    "Guests",
      questions: "Have an urgent question?",
      call:      `Call us at`,
    },
  };

  const tx = t[data.idioma] ?? t.es;

  const body = `
    <!--clock icon-->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;background-color:#fffbeb;border-radius:50%;border:2px solid #fde68a">
        <span style="font-size:26px;line-height:1">⏳</span>
      </div>
    </div>

    <h1 style="margin:0 0 12px;font-size:22px;color:#0a0a0a;font-weight:700;text-align:center">${tx.heading}</h1>
    <p style="margin:0 0 4px;font-size:15px;color:#555555;line-height:1.7;text-align:center">${tx.intro}</p>

    ${detallesCard([
      [tx.date,   displayDate],
      [tx.time,   displayHora],
      [tx.guests, `${data.personas}`],
    ])}

    <!--Notice-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-bottom:32px">
      <tr>
        <td style="padding:18px 20px">
          <p style="margin:0;font-size:14px;color:#92400e;line-height:1.7">${tx.notice}</p>
        </td>
      </tr>
    </table>

    <!--Call us-->
    <p style="margin:0;font-size:13px;color:#aaaaaa;text-align:center;line-height:1.8">
      ${tx.questions}<br>
      ${tx.call} <a href="tel:${RESTAURANT_PHONE.replace(/\s/g, "")}" style="color:#0a0a0a;font-weight:600;text-decoration:none">${RESTAURANT_PHONE}</a>
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
      heading:   "Reserva cancelada",
      intro:     `Hola <strong>${data.nombre}</strong>, confirmamos que tu reserva ha sido cancelada correctamente.`,
      date:      "Fecha",
      time:      "Hora",
      guests:    "Personas",
      hope:      "Esperamos verte pronto por aquí.",
      rebook:    "Hacer una nueva reserva",
    },
    ca: {
      heading:   "Reserva cancel·lada",
      intro:     `Hola <strong>${data.nombre}</strong>, confirmem que la teva reserva ha estat cancel·lada correctament.`,
      date:      "Data",
      time:      "Hora",
      guests:    "Persones",
      hope:      "Esperem veure't aviat per aquí.",
      rebook:    "Fer una nova reserva",
    },
    en: {
      heading:   "Booking cancelled",
      intro:     `Hi <strong>${data.nombre}</strong>, we confirm that your booking has been successfully cancelled.`,
      date:      "Date",
      time:      "Time",
      guests:    "Guests",
      hope:      "We hope to see you soon.",
      rebook:    "Make a new booking",
    },
  };

  const tx = t[data.idioma] ?? t.es;

  const body = `
    <!--x icon-->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;background-color:#fafafa;border-radius:50%;border:2px solid #e5e5e5">
        <span style="color:#aaaaaa;font-size:26px;line-height:1">✕</span>
      </div>
    </div>

    <h1 style="margin:0 0 12px;font-size:22px;color:#0a0a0a;font-weight:700;text-align:center">${tx.heading}</h1>
    <p style="margin:0 0 4px;font-size:15px;color:#555555;line-height:1.7;text-align:center">${tx.intro}</p>

    ${detallesCard([
      [tx.date,   displayDate],
      [tx.time,   displayHora],
      [tx.guests, `${data.personas}`],
    ])}

    <p style="margin:0 0 28px;font-size:15px;color:#555555;line-height:1.7;text-align:center">${tx.hope}</p>

    <!--Rebook CTA-->
    <div style="text-align:center">
      <a href="${bookUrl}"
         style="display:inline-block;background-color:#0a0a0a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.3px">
        ${tx.rebook}
      </a>
    </div>`;

  return layout(body, `${displayDate} · ${displayHora}`, data.idioma);
}

// ── Exports ────────────────────────────────────────────────────

export async function sendConfirmationEmail(data: ReservaEmailData) {
  const subjects: Record<string, string> = {
    es: `Reserva confirmada · ${data.hora.slice(0, 5)} del ${formatFechaEmail(data.fecha, "es")}`,
    ca: `Reserva confirmada · ${data.hora.slice(0, 5)} del ${formatFechaEmail(data.fecha, "ca")}`,
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
    es: `Tu reserva ha sido cancelada · ${RESTAURANT_NAME}`,
    ca: `La teva reserva ha estat cancel·lada · ${RESTAURANT_NAME}`,
    en: `Your booking has been cancelled · ${RESTAURANT_NAME}`,
  };
  await getResend().emails.send({
    from: FROM,
    to: data.email,
    subject: subjects[data.idioma] ?? subjects.es,
    html: cancellationHtml(data),
  });
}
