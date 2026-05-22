import { writeFileSync } from "fs";

// ── Config (mismo que emails.ts) ───────────────────────────────
const RESTAURANT_NAME    = "Corte de Manga";
const RESTAURANT_PHONE   = "+34 931 234 567";
const RESTAURANT_ADDRESS = "Comte d'Urgell 108, 08011 Barcelona";
const RESTAURANT_MAPS    = "https://maps.google.com";
const RESTAURANT_LOGO    = ""; // pega aquí tu URL de logo cuando lo tengas
const APP_URL            = "https://cortedemanga.es";

// ── Helpers ────────────────────────────────────────────────────

function formatFechaEmail(fecha, idioma) {
  const [y, m, d] = fecha.split("-").map(Number);
  const localeMap = { es: "es-ES", ca: "ca-ES", en: "en-GB" };
  return new Date(y, m - 1, d).toLocaleDateString(localeMap[idioma] ?? "es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function generateGoogleCalendarLink(data) {
  const [year, month, day] = data.fecha.split("-").map(Number);
  const [hour, minute] = data.hora.slice(0, 5).split(":").map(Number);
  const pad = (n) => String(n).padStart(2, "0");
  const start = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;
  const end   = `${year}${pad(month)}${pad(day)}T${pad(hour + 2)}${pad(minute)}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Reserva en ${RESTAURANT_NAME}`,
    dates: `${start}/${end}`,
    details: `Reserva para ${data.personas} personas en ${RESTAURANT_NAME}.`,
    location: RESTAURANT_ADDRESS,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function langAttr(idioma) {
  return idioma === "ca" ? "ca" : idioma === "en" ? "en" : "es";
}

function detallesCard(rows) {
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

function layout(body, preview, idioma) {
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
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preview}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0eeec">
    <tr><td align="center" style="padding:40px 16px 48px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px">
        <tr>
          <td style="background-color:#0a0a0a;border-radius:14px 14px 0 0;padding:40px 32px;text-align:center">
            ${headerContent}
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;padding:44px 40px 36px">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="background-color:#111111;border-radius:0 0 14px 14px;padding:28px 32px;text-align:center">
            <p style="margin:0;color:#666666;font-size:12px;line-height:1.7">${RESTAURANT_NAME} &nbsp;·&nbsp; ${RESTAURANT_ADDRESS}</p>
            <p style="margin:6px 0 0"><a href="tel:${RESTAURANT_PHONE.replace(/\s/g, "")}" style="color:#888888;text-decoration:none;font-size:12px">${RESTAURANT_PHONE}</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Confirmación ───────────────────────────────────────────────

function confirmationHtml(data) {
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = data.hora.slice(0, 5);
  const cancelUrl   = `${APP_URL}/${data.idioma}/cancelar/${data.cancel_token}`;
  const calendarUrl = generateGoogleCalendarLink(data);

  const t = {
    es: { heading:"¡Reserva confirmada!", intro:`Hola <strong>${data.nombre}</strong>, tu mesa está reservada. Te esperamos con las mesas listas.`, date:"Fecha", time:"Hora", guests:"Personas", address:"Dónde", calendar_btn:"Añadir al calendario", maps_btn:"Cómo llegar", cancel:"Si necesitas cancelar tu reserva, puedes hacerlo desde aquí.", cancel_link:"Cancelar reserva" },
    ca: { heading:"Reserva confirmada!", intro:`Hola <strong>${data.nombre}</strong>, la teva taula està reservada. T'esperem amb les taules a punt.`, date:"Data", time:"Hora", guests:"Persones", address:"On", calendar_btn:"Afegir al calendari", maps_btn:"Com arribar", cancel:"Si necessites cancel·lar la reserva, pots fer-ho des d'aquí.", cancel_link:"Cancel·lar reserva" },
    en: { heading:"Booking confirmed!", intro:`Hi <strong>${data.nombre}</strong>, your table is booked. We'll have everything ready for you.`, date:"Date", time:"Time", guests:"Guests", address:"Where", calendar_btn:"Add to calendar", maps_btn:"Get directions", cancel:"If you need to cancel your booking, you can do so here.", cancel_link:"Cancel booking" },
  };
  const tx = t[data.idioma] ?? t.es;

  const body = `
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;background-color:#f0fdf4;border-radius:50%;border:2px solid #bbf7d0">
        <span style="color:#16a34a;font-size:26px;line-height:1">✓</span>
      </div>
    </div>
    <h1 style="margin:0 0 12px;font-size:22px;color:#0a0a0a;font-weight:700;text-align:center">${tx.heading}</h1>
    <p style="margin:0 0 4px;font-size:15px;color:#555555;line-height:1.7;text-align:center">${tx.intro}</p>
    ${detallesCard([[tx.date, displayDate],[tx.time, displayHora],[tx.guests, `${data.personas}`],[tx.address, RESTAURANT_ADDRESS]])}
    <div style="text-align:center;margin:28px 0 16px">
      <a href="${calendarUrl}" style="display:inline-block;background-color:#b12a2a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.3px">📅 ${tx.calendar_btn}</a>
    </div>
    <div style="text-align:center;margin-bottom:36px">
      <a href="${RESTAURANT_MAPS}" style="color:#888888;font-size:13px;text-decoration:none">📍 ${tx.maps_btn}</a>
    </div>
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 24px">
    <p style="margin:0;font-size:13px;color:#aaaaaa;text-align:center;line-height:1.6">
      ${tx.cancel}<br>
      <a href="${cancelUrl}" style="color:#aaaaaa;font-size:12px;text-decoration:underline">${tx.cancel_link}</a>
    </p>`;

  return layout(body, `${displayDate} · ${displayHora} · ${data.personas} pers.`, data.idioma);
}

// ── Pendiente ──────────────────────────────────────────────────

function pendingHtml(data) {
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = data.hora.slice(0, 5);

  const t = {
    es: { heading:"Solicitud recibida", intro:`Hola <strong>${data.nombre}</strong>, hemos recibido tu solicitud de reserva para grupo.`, notice:`Los grupos a partir de ${data.personas} personas requieren confirmación por nuestra parte. Te escribiremos en las próximas horas con la confirmación definitiva.`, date:"Fecha solicitada", time:"Hora", guests:"Personas", questions:"¿Tienes alguna pregunta urgente?", call:"Llámanos al" },
    ca: { heading:"Sol·licitud rebuda", intro:`Hola <strong>${data.nombre}</strong>, hem rebut la teva sol·licitud de reserva per a grup.`, notice:`Els grups a partir de ${data.personas} persones requereixen confirmació per la nostra part. T'escriurem en les properes hores amb la confirmació definitiva.`, date:"Data sol·licitada", time:"Hora", guests:"Persones", questions:"Tens alguna pregunta urgent?", call:"Truca'ns al" },
    en: { heading:"Request received", intro:`Hi <strong>${data.nombre}</strong>, we've received your group booking request.`, notice:`Groups of ${data.personas} or more guests require confirmation from our side. We'll email you within the next few hours with a final confirmation.`, date:"Requested date", time:"Time", guests:"Guests", questions:"Have an urgent question?", call:"Call us at" },
  };
  const tx = t[data.idioma] ?? t.es;

  const body = `
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;background-color:#fffbeb;border-radius:50%;border:2px solid #fde68a">
        <span style="font-size:26px;line-height:1">⏳</span>
      </div>
    </div>
    <h1 style="margin:0 0 12px;font-size:22px;color:#0a0a0a;font-weight:700;text-align:center">${tx.heading}</h1>
    <p style="margin:0 0 4px;font-size:15px;color:#555555;line-height:1.7;text-align:center">${tx.intro}</p>
    ${detallesCard([[tx.date, displayDate],[tx.time, displayHora],[tx.guests, `${data.personas}`]])}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin-bottom:32px">
      <tr><td style="padding:18px 20px"><p style="margin:0;font-size:14px;color:#92400e;line-height:1.7">${tx.notice}</p></td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#aaaaaa;text-align:center;line-height:1.8">
      ${tx.questions}<br>
      ${tx.call} <a href="tel:${RESTAURANT_PHONE.replace(/\s/g, "")}" style="color:#0a0a0a;font-weight:600;text-decoration:none">${RESTAURANT_PHONE}</a>
    </p>`;

  return layout(body, `${data.personas} pers. · ${displayDate} · ${displayHora}`, data.idioma);
}

// ── Cancelación ────────────────────────────────────────────────

function cancellationHtml(data) {
  const displayDate = formatFechaEmail(data.fecha, data.idioma);
  const displayHora = data.hora.slice(0, 5);
  const bookUrl     = `${APP_URL}/${data.idioma}`;

  const t = {
    es: { heading:"Reserva cancelada", intro:`Hola <strong>${data.nombre}</strong>, confirmamos que tu reserva ha sido cancelada correctamente.`, date:"Fecha", time:"Hora", guests:"Personas", hope:"Esperamos verte pronto por aquí.", rebook:"Hacer una nueva reserva" },
    ca: { heading:"Reserva cancel·lada", intro:`Hola <strong>${data.nombre}</strong>, confirmem que la teva reserva ha estat cancel·lada correctament.`, date:"Data", time:"Hora", guests:"Persones", hope:"Esperem veure't aviat per aquí.", rebook:"Fer una nova reserva" },
    en: { heading:"Booking cancelled", intro:`Hi <strong>${data.nombre}</strong>, we confirm that your booking has been successfully cancelled.`, date:"Date", time:"Time", guests:"Guests", hope:"We hope to see you soon.", rebook:"Make a new booking" },
  };
  const tx = t[data.idioma] ?? t.es;

  const body = `
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:60px;height:60px;background-color:#fafafa;border-radius:50%;border:2px solid #e5e5e5">
        <span style="color:#aaaaaa;font-size:26px;line-height:1">✕</span>
      </div>
    </div>
    <h1 style="margin:0 0 12px;font-size:22px;color:#0a0a0a;font-weight:700;text-align:center">${tx.heading}</h1>
    <p style="margin:0 0 4px;font-size:15px;color:#555555;line-height:1.7;text-align:center">${tx.intro}</p>
    ${detallesCard([[tx.date, displayDate],[tx.time, displayHora],[tx.guests, `${data.personas}`]])}
    <p style="margin:0 0 28px;font-size:15px;color:#555555;line-height:1.7;text-align:center">${tx.hope}</p>
    <div style="text-align:center">
      <a href="${bookUrl}" style="display:inline-block;background-color:#0a0a0a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.3px">${tx.rebook}</a>
    </div>`;

  return layout(body, `${displayDate} · ${displayHora}`, data.idioma);
}

// ── Generar archivos ───────────────────────────────────────────

const sample = {
  nombre: "María",
  apellido: "García",
  email: "maria@ejemplo.com",
  fecha: "2025-06-20",
  hora: "14:00:00",
  personas: 4,
  cancel_token: "tok_ejemplo_000000",
  idioma: "es",
};

const sampleGrupo = { ...sample, personas: 10, idioma: "es" };

writeFileSync("email-confirmacion.html",  confirmationHtml(sample),      "utf8");
writeFileSync("email-pendiente.html",     pendingHtml(sampleGrupo),      "utf8");
writeFileSync("email-cancelacion.html",   cancellationHtml(sample),      "utf8");

console.log("✓ email-confirmacion.html");
console.log("✓ email-pendiente.html");
console.log("✓ email-cancelacion.html");
