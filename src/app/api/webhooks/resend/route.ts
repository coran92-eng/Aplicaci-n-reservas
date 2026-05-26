import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Resend sends webhook events for email delivery status.
// Docs: https://resend.com/docs/dashboard/webhooks/event-types
interface ResendEvent {
  type: string;
  data: {
    email_id: string;
    to: string[];
    subject?: string;
    tags?: { name: string; value: string }[];
  };
}

export async function POST(req: NextRequest) {
  // Validate webhook signature if RESEND_WEBHOOK_SECRET is set
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("svix-signature") ?? "";
    if (!sig.includes(secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: ResendEvent;
  try {
    event = (await req.json()) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type === "email.bounced" || event.type === "email.complained") {
    const email = event.data.to?.[0];
    if (email) {
      try {
        const sc = createServiceClient();
        // Mark the most recent unresolved reservation for this email with a note
        const note = event.type === "email.bounced"
          ? "[EMAIL_BOUNCE] El email ha rebotado"
          : "[EMAIL_COMPLAINT] El destinatario marcó el email como spam";

        const { data: reservas } = await sc
          .from("reservas")
          .select("id, notas_internas")
          .eq("email", email.toLowerCase())
          .in("estado", ["confirmada", "pendiente_aprobacion"])
          .order("created_at", { ascending: false })
          .limit(1);

        if (reservas?.[0]) {
          const existing = reservas[0].notas_internas ?? "";
          await sc
            .from("reservas")
            .update({ notas_internas: existing ? `${existing}\n${note}` : note })
            .eq("id", reservas[0].id);
        }

        console.warn(`[RESEND_WEBHOOK] ${event.type} for ${email}`);
      } catch (err) {
        console.error("[RESEND_WEBHOOK] DB update failed:", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
