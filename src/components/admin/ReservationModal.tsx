"use client";

import { useState } from "react";
import { X, Phone, MessageCircle, Check, UserX, Ban, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatTime } from "@/lib/utils";
import { updateEstadoReserva, updateNotasInternas } from "@/actions/reservas";
import type { Reserva } from "@/lib/supabase/types";

const STATUS_CONFIG = {
  confirmada: { label: "Confirmada", className: "bg-gray-100 text-gray-700" },
  llegado: { label: "Ha llegado", className: "bg-green-100 text-green-700" },
  no_show: { label: "No show", className: "bg-red-100 text-red-700" },
  cancelada: { label: "Cancelada", className: "bg-gray-100 text-gray-400 line-through" },
  pendiente_aprobacion: { label: "Pendiente", className: "bg-amber-100 text-amber-700" },
  rechazada: { label: "Rechazada", className: "bg-red-100 text-red-400" },
};

interface Props {
  reserva: Reserva;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Reserva>) => void;
}

export function ReservationModal({ reserva, onClose, onUpdate }: Props) {
  const [notas, setNotas] = useState(reserva.notas_internas ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const whatsappNumber = reserva.telefono.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

  async function handleEstado(estado: Reserva["estado"]) {
    setLoading(estado);
    const result = await updateEstadoReserva(reserva.id, estado);
    if (result.ok) {
      onUpdate(reserva.id, { estado });
    }
    setLoading(null);
    setConfirmCancel(false);
  }

  async function handleSaveNotas() {
    setSaving(true);
    const result = await updateNotasInternas(reserva.id, notas);
    if (result.ok) {
      onUpdate(reserva.id, { notas_internas: notas || null });
    }
    setSaving(false);
  }

  const status = STATUS_CONFIG[reserva.estado];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onClose} className="admin-btn">
          <X className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">
            {reserva.nombre} {reserva.apellido}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatTime(reserva.hora)} · {reserva.personas} personas
          </p>
        </div>
        <span className={cn("px-3 py-1 rounded-full text-sm font-medium", status.className)}>
          {status.label}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Contact */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <a href={`tel:${reserva.telefono}`} className="flex-1">
              <Button variant="outline" size="lg" className="w-full admin-btn gap-2">
                <Phone className="h-5 w-5" />
                Llamar
              </Button>
            </a>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" size="lg" className="w-full admin-btn gap-2">
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </Button>
            </a>
          </div>
          <a href={`mailto:${reserva.email}`} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
            {reserva.email}
          </a>
        </div>

        {/* Details */}
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha</span>
            <span className="font-medium">{reserva.fecha}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hora</span>
            <span className="font-medium">{formatTime(reserva.hora)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Personas</span>
            <span className="font-medium">{reserva.personas}</span>
          </div>
        </div>

        {/* Notas cliente */}
        {reserva.notas_cliente && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Notas del cliente</p>
            <p className="text-sm text-muted-foreground rounded-lg bg-muted p-3">
              {reserva.notas_cliente}
            </p>
          </div>
        )}

        {/* Notas internas */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Notas internas</p>
          <Textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Sin notas"
            rows={3}
            className="text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveNotas}
            disabled={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar notas"}
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      {reserva.estado !== "cancelada" && reserva.estado !== "rechazada" && (
        <div className="p-4 border-t space-y-3">
          {reserva.estado !== "llegado" && (
            <Button
              size="xl"
              className="w-full bg-green-600 hover:bg-green-700 text-white admin-btn gap-2"
              onClick={() => handleEstado("llegado")}
              disabled={loading === "llegado"}
            >
              <Check className="h-5 w-5" />
              {loading === "llegado" ? "..." : "Ha llegado"}
            </Button>
          )}
          {reserva.estado !== "no_show" && (
            <Button
              size="xl"
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50 admin-btn gap-2"
              onClick={() => handleEstado("no_show")}
              disabled={loading === "no_show"}
            >
              <UserX className="h-5 w-5" />
              {loading === "no_show" ? "..." : "No show"}
            </Button>
          )}
          {confirmCancel ? (
            <div className="flex gap-2">
              <Button
                size="lg"
                variant="destructive"
                className="flex-1 admin-btn"
                onClick={() => handleEstado("cancelada")}
                disabled={loading === "cancelada"}
              >
                {loading === "cancelada" ? "..." : "Confirmar cancelación"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 admin-btn"
                onClick={() => setConfirmCancel(false)}
              >
                No cancelar
              </Button>
            </div>
          ) : (
            <Button
              size="lg"
              variant="outline"
              className="w-full admin-btn gap-2 text-muted-foreground"
              onClick={() => setConfirmCancel(true)}
            >
              <Ban className="h-4 w-4" />
              Cancelar reserva
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
