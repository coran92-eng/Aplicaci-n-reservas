import { Resend } from "resend";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no configurada");
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const RESTAURANT_NAME = process.env.RESTAURANT_NAME ?? "Corte de Manga";
const RESTAURANT_PHONE = process.env.RESTAURANT_PHONE ?? "+34 931 234 567";
const RESTAURANT_ADDRESS =
  process.env.RESTAURANT_ADDRESS ?? "Comte d'Urgell 108, 08011 Barcelona";
const RESTAURANT_MAPS =
  process.env.RESTAURANT_GOOGLE_MAPS_URL ?? "https://maps.google.com";

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

function formatDateForEmail(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function generateGoogleCalendarLink(data: ReservaEmailData): string {
  const [year, month, day] = data.fecha.split("-").map(Number);
  const [hour, minute] = data.hora.slice(0, 5).split(":").map(Number);

  // Formato: YYYYMMDDTHHMMSS (sin Z, es hora local)
  const pad = (n: number) => String(n).padStart(2, "0");
  const startDt = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
  // Duración estimada: 1.5 horas
  const endHour = hour + 1;
  const endDt = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(minute)}00`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Reserva en ${RESTAURANT_NAME}`,
    dates: `${startDt}/${endDt}`,
    details: `Reserva para ${data.personas} personas.`,
    location: RESTAURANT_ADDRESS,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatFechaEmail(fecha: string, idioma: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const localeMap: Record<string, string> = { es: "es-ES", ca: "ca-ES", en: "en-GB" };
  return date.toLocaleDateString(localeMap[idioma] ?? "es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function subjectConfirmation(idioma: string, fecha: string, hora: string): string {
  const displayDate = formatDateForEmail(fecha);
  const displayHora = hora.slice(0, 5);
  const subjects: Record<string, string> = {
    es: `Tu reserva en ${RESTAURANT_NAME} · ${displayDate} ${displayHora}`,
    ca: `La teva reserva a ${RESTAURANT_NAME} · ${displayDate} ${displayHora}`,
    en: `Your booking at ${RESTAURANT_NAME} · ${displayDate} ${displayHora}`,
  };
  return subjects[idioma] ?? subjects.es;
}

function confirmationHtml(data: ReservaEmailData): string {
  const cancelUrl = `${APP_URL}/${data.idioma}/cancelar/${data.cancel_token}`;
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = data.hora.slice(0, 5);
  const calendarUrl = generateGoogleCalendarLink(data);

  const texts: Record<string, Record<string, string>> = {
    es: {
      greeting: `Hola ${data.nombre},`,
      body: "¡Tu reserva está confirmada! Te esperamos en",
      date_label: "Fecha",
      time_label: "Hora",
      people_label: "Personas",
      cancel: "Cancelar mi reserva",
      footer: `Si necesitas ayuda, llámanos al`,
    },
    ca: {
      greeting: `Hola ${data.nombre},`,
      body: "La teva reserva està confirmada! T'esperem a",
      date_label: "Data",
      time_label: "Hora",
      people_label: "Persones",
      cancel: "Cancel·lar la meva reserva",
      footer: `Si necessites ajuda, truca'ns al`,
    },
    en: {
      greeting: `Hi ${data.nombre},`,
      body: "Your booking is confirmed! We'll see you at",
      date_label: "Date",
      time_label: "Time",
      people_label: "Guests",
      cancel: "Cancel my booking",
      footer: `If you need help, call us at`,
    },
  };

  const t = texts[data.idioma] ?? texts.es;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f9f9f9;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#1a1a1a;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">${RESTAURANT_NAME}</h1>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;color:#333">${t.greeting}</p>
      <p style="font-size:16px;color:#333">${t.body} <strong>${RESTAURANT_NAME}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0">
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;color:#666;font-size:14px">${t.date_label}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;font-weight:600;font-size:14px">${displayDate}</td>
        </tr>
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;color:#666;font-size:14px">${t.time_label}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;font-weight:600;font-size:14px">${displayHora}</td>
        </tr>
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;color:#666;font-size:14px">${t.people_label}</td>
          <td style="padding:10px;border-bottom:1px solid #eee;font-weight:600;font-size:14px">${data.personas}</td>
        </tr>
      </table>
      <p style="font-size:13px;color:#666">${RESTAURANT_ADDRESS}</p>
      <a href="${RESTAURANT_MAPS}" style="display:inline-block;margin-bottom:24px;font-size:13px;color:#1a1a1a">📍 Ver en Google Maps</a>
      <div style="text-align:center;margin:24px 0">
        <a href="${calendarUrl}"
           style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500">
          📅 Añadir al calendario
        </a>
      </div>
      <div style="text-align:center;margin-top:24px">
        <a href="${cancelUrl}" style="font-size:13px;color:#999;text-decoration:underline">${t.cancel}</a>
      </div>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center">
      <p style="font-size:12px;color:#999;margin:0">${t.footer} <a href="tel:${RESTAURANT_PHONE}" style="color:#999;text-decoration:none">${RESTAURANT_PHONE}</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function pendingHtml(data: ReservaEmailData): string {
  const displayDate = formatDateForEmail(data.fecha);
  const displayHora = data.hora.slice(0, 5);

  const texts: Record<string, Record<string, string>> = {
    es: {
      title: "Solicitud recibida",
      greeting: `Hola ${data.nombre},`,
      body: "Hemos recibido tu solicitud de reserva para grupo grande.",
      info: "Los grupos de más de 7 personas requieren confirmación manual. Te enviaremos un email con la confirmación en las próximas horas.",
      footer: `Si necesitas ayuda urgente, llámanos al ${RESTAURANT_PHONE}`,
    },
    ca: {
      title: "Sol·licitud rebuda",
      greeting: `Hola ${data.nombre},`,
      body: "Hem rebut la teva sol·licitud de reserva per a grup gran.",
      info: "Els grups de més de 7 persones requereixen confirmació manual. T'enviarem un correu amb la confirmació en les properes hores.",
      footer: `Si necessites ajuda urgent, truca'ns al ${RESTAURANT_PHONE}`,
    },
    en: {
      title: "Request received",
      greeting: `Hi ${data.nombre},`,
      body: "We've received your large group booking request.",
      info: "Groups of more than 7 guests require manual confirmation. We'll send you a confirmation email within the next few hours.",
      footer: `If you need urgent help, call us at ${RESTAURANT_PHONE}`,
    },
  };

  const t = texts[data.idioma] ?? texts.es;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f9f9f9;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#1a1a1a;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">${RESTAURANT_NAME}</h1>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;color:#333">${t.greeting}</p>
      <p style="font-size:16px;color:#333">${t.body}</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0">
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;color:#666;font-size:14px">Fecha / Date</td>
          <td style="padding:10px;border-bottom:1px solid #eee;font-weight:600;font-size:14px">${displayDate}</td>
        </tr>
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;color:#666;font-size:14px">Hora / Time</td>
          <td style="padding:10px;border-bottom:1px solid #eee;font-weight:600;font-size:14px">${displayHora}</td>
        </tr>
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;color:#666;font-size:14px">Personas / Guests</td>
          <td style="padding:10px;border-bottom:1px solid #eee;font-weight:600;font-size:14px">${data.personas}</td>
        </tr>
      </table>
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:16px;margin-bottom:16px">
        <p style="font-size:14px;color:#92400e;margin:0">${t.info}</p>
      </div>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center">
      <p style="font-size:12px;color:#999;margin:0">${t.footer}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function cancellationHtml(data: ReservaEmailData): string {
  const displayDate = formatDateForEmail(data.fecha);
  const displayHora = data.hora.slice(0, 5);

  const texts: Record<string, Record<string, string>> = {
    es: {
      greeting: `Hola ${data.nombre},`,
      body: "Tu reserva ha sido cancelada.",
      hope: "Esperamos verte pronto.",
      footer: `${RESTAURANT_NAME} · ${RESTAURANT_PHONE}`,
    },
    ca: {
      greeting: `Hola ${data.nombre},`,
      body: "La teva reserva ha estat cancel·lada.",
      hope: "Esperem veure't aviat.",
      footer: `${RESTAURANT_NAME} · ${RESTAURANT_PHONE}`,
    },
    en: {
      greeting: `Hi ${data.nombre},`,
      body: "Your booking has been cancelled.",
      hope: "Hope to see you soon.",
      footer: `${RESTAURANT_NAME} · ${RESTAURANT_PHONE}`,
    },
  };

  const t = texts[data.idioma] ?? texts.es;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f9f9f9;margin:0;padding:20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#1a1a1a;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">${RESTAURANT_NAME}</h1>
    </div>
    <div style="padding:32px">
      <p style="font-size:16px;color:#333">${t.greeting}</p>
      <p style="font-size:16px;color:#333">${t.body} (${displayDate} ${displayHora}, ${data.personas} pers.)</p>
      <p style="font-size:16px;color:#333">${t.hope}</p>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center">
      <p style="font-size:12px;color:#999;margin:0">${t.footer}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendConfirmationEmail(data: ReservaEmailData) {
  const subject = subjectConfirmation(data.idioma, data.fecha, data.hora);
  await getResend().emails.send({
    from: FROM,
    to: data.email,
    subject,
    html: confirmationHtml(data),
  });
}

export async function sendPendingEmail(data: ReservaEmailData) {
  const subjects: Record<string, string> = {
    es: `Hemos recibido tu solicitud · ${RESTAURANT_NAME}`,
    ca: `Hem rebut la teva sol·licitud · ${RESTAURANT_NAME}`,
    en: `We've received your request · ${RESTAURANT_NAME}`,
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
