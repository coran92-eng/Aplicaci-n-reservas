// WhatsApp Business (Meta Cloud API) integration
//
// Required templates in Meta Business Manager (developers.facebook.com → Your App → WhatsApp → Templates):
//   - reserva_confirmada  — language: es — body params: {{1}} nombre, {{2}} personas, {{3}} fecha_larga, {{4}} hora
//   - reserva_recordatorio — language: es — body params: {{1}} nombre, {{2}} fecha_larga, {{3}} hora, {{4}} personas
//   - solicitud_pendiente — language: es — body params: {{1}} nombre, {{2}} personas

const GRAPH_API_BASE = "https://graph.facebook.com/v20.0";

/** Normalize phone number to E.164 format */
function normalizePhone(phone: string): string {
  // Remove all spaces
  let p = phone.replace(/\s/g, "");
  // Replace leading 00 with +
  if (p.startsWith("00")) p = "+" + p.slice(2);
  // Add default +34 prefix if no + at start
  if (!p.startsWith("+")) p = "+34" + p;
  return p;
}

/** Map locale to WhatsApp language code */
function toWhatsAppLocale(locale: string): string {
  if (locale === "en") return "en_US";
  // "ca" (Catalan) is not supported by WhatsApp — fall back to Spanish
  return "es";
}

/** Format date string (YYYY-MM-DD) as "jueves 5 de junio" */
function formatFechaLarga(fecha: string): string {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export interface WhatsAppResult {
  messageId?: string;
  error?: string;
}

/**
 * Send a WhatsApp template message via Meta Cloud API.
 * Returns { messageId } on success, { error } on failure.
 * Returns { error: "not_configured" } if env vars are missing (no throw).
 */
export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  langCode: string,
  bodyParams: string[]
): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { error: "not_configured" };
  }

  const normalizedPhone = normalizePhone(phone);
  const whatsappLang = toWhatsAppLocale(langCode);

  const body = {
    messaging_product: "whatsapp",
    to: normalizedPhone,
    type: "template",
    template: {
      name: templateName,
      language: { code: whatsappLang },
      components: [
        {
          type: "body",
          parameters: bodyParams.map((text) => ({ type: "text", text })),
        },
      ],
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const json = (await response.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message: string };
    };

    if (!response.ok || json.error) {
      const errMsg = json.error?.message ?? `HTTP ${response.status}`;
      console.error("[WHATSAPP] API error:", errMsg);
      return { error: errMsg };
    }

    const messageId = json.messages?.[0]?.id;
    return { messageId };
  } catch (err) {
    clearTimeout(timeoutId);
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[WHATSAPP] Fetch error:", errMsg);
    return { error: errMsg };
  }
}

/**
 * Send reservation confirmation WhatsApp.
 * Template: reserva_confirmada — params: [nombre, personas, fecha_larga, hora]
 */
export async function sendConfirmationWhatsApp(data: {
  phone: string;
  nombre: string;
  fecha: string;
  hora: string;
  personas: number;
  locale: string;
  reservaId: string;
}): Promise<WhatsAppResult> {
  const fechaLarga = formatFechaLarga(data.fecha);
  const hora = data.hora.slice(0, 5); // HH:MM

  return sendWhatsAppTemplate(data.phone, "reserva_confirmada", data.locale, [
    data.nombre,
    String(data.personas),
    fechaLarga,
    hora,
  ]);
}

/**
 * Send reservation reminder WhatsApp (24h before).
 * Template: reserva_recordatorio — params: [nombre, fecha_larga, hora, personas]
 */
export async function sendReminderWhatsApp(data: {
  phone: string;
  nombre: string;
  fecha: string;
  hora: string;
  personas: number;
  locale: string;
}): Promise<WhatsAppResult> {
  const fechaLarga = formatFechaLarga(data.fecha);
  const hora = data.hora.slice(0, 5);

  return sendWhatsAppTemplate(
    data.phone,
    "reserva_recordatorio",
    data.locale,
    [data.nombre, fechaLarga, hora, String(data.personas)]
  );
}

/**
 * Send pending group request WhatsApp notification.
 * Template: solicitud_pendiente — params: [nombre, personas]
 */
export async function sendPendingWhatsApp(data: {
  phone: string;
  nombre: string;
  personas: number;
  locale: string;
}): Promise<WhatsAppResult> {
  return sendWhatsAppTemplate(
    data.phone,
    "solicitud_pendiente",
    data.locale,
    [data.nombre, String(data.personas)]
  );
}
