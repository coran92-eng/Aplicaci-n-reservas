"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendManualWhatsApp } from "@/actions/whatsapp";
import type { WhatsAppLog as WhatsAppLogType } from "@/lib/supabase/types";

interface Props {
  reservaId: string;
  telefono: string;
}

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-gray-100 text-gray-600",
  failed: "bg-red-100 text-red-600",
  delivered: "bg-green-100 text-green-700",
  read: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS: Record<string, string> = {
  sent: "Enviado",
  failed: "Error",
  delivered: "Entregado",
  read: "Leído",
};

const TEMPLATE_LABELS: Record<string, string> = {
  reserva_confirmada: "Confirmación",
  reserva_recordatorio: "Recordatorio",
  solicitud_pendiente: "Solicitud pendiente",
};

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WhatsAppLog({ reservaId, telefono }: Props) {
  const [logs, setLogs] = useState<WhatsAppLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sendFeedback, setSendFeedback] = useState<{
    template: string;
    ok: boolean;
    msg?: string;
  } | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/whatsapp-logs?reservaId=${encodeURIComponent(reservaId)}`
      );
      if (!res.ok) {
        setError("Error al cargar los logs");
        return;
      }
      const json = (await res.json()) as { logs: WhatsAppLogType[] };
      setLogs(json.logs ?? []);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, [reservaId]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  async function handleSend(
    template: "reserva_confirmada" | "reserva_recordatorio"
  ) {
    setSending(template);
    setSendFeedback(null);
    const result = await sendManualWhatsApp(reservaId, template);
    setSending(null);
    setSendFeedback({
      template,
      ok: result.ok,
      msg: result.error,
    });
    if (result.ok) {
      // Reload logs to show the new entry
      void fetchLogs();
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-600" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            WhatsApp
          </span>
        </div>
        <button
          onClick={() => void fetchLogs()}
          disabled={loading}
          className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label="Recargar logs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Send buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 text-xs text-gray-700 border-gray-300"
          onClick={() => void handleSend("reserva_confirmada")}
          disabled={sending !== null}
        >
          <Send className="h-3.5 w-3.5" />
          {sending === "reserva_confirmada" ? "Enviando..." : "Confirmación"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 text-xs text-gray-700 border-gray-300"
          onClick={() => void handleSend("reserva_recordatorio")}
          disabled={sending !== null}
        >
          <Send className="h-3.5 w-3.5" />
          {sending === "reserva_recordatorio" ? "Enviando..." : "Recordatorio"}
        </Button>
      </div>

      {/* Send feedback */}
      {sendFeedback && (
        <p
          className={`text-xs px-3 py-1.5 rounded-lg ${
            sendFeedback.ok
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {sendFeedback.ok
            ? `${TEMPLATE_LABELS[sendFeedback.template] ?? sendFeedback.template} enviado correctamente`
            : `Error: ${sendFeedback.msg ?? "desconocido"}`}
        </p>
      )}

      {/* Logs table */}
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : loading && logs.length === 0 ? (
        <p className="text-xs text-gray-400">Cargando...</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-gray-400">
          Sin mensajes enviados aún · {telefono}
        </p>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-medium text-gray-500">Plantilla</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Estado</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Hora</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr
                  key={log.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                >
                  <td className="px-3 py-2 text-gray-700">
                    {TEMPLATE_LABELS[log.template] ?? log.template}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                        STATUS_STYLES[log.status] ?? STATUS_STYLES.sent
                      }`}
                    >
                      {STATUS_LABELS[log.status] ?? log.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                    {formatTime(log.sent_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
