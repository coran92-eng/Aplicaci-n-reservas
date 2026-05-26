"use client";

import { useState } from "react";
import { X, Phone, MessageCircle, Check, UserX, Ban, Save, Pencil, ThumbsUp, ThumbsDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatTime, todayBarcelona } from "@/lib/utils";
import { updateEstadoReserva, updateNotasInternas, updateReserva, approveReserva, rejectReserva } from "@/actions/reservas";
import type { Reserva } from "@/lib/supabase/types";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  confirmada:           { label: "Confirmada",  className: "bg-gray-100 text-gray-700" },
  llegado:              { label: "Ha llegado",  className: "bg-green-100 text-green-700" },
  no_show:              { label: "No show",     className: "bg-red-100 text-red-700" },
  cancelada:            { label: "Cancelada",   className: "bg-gray-100 text-gray-400 line-through" },
  pendiente_aprobacion: { label: "Pendiente",   className: "bg-amber-100 text-amber-700" },
  rechazada:            { label: "Rechazada",   className: "bg-red-100 text-red-400" },
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
  const [confirmReject, setConfirmReject] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    nombre: reserva.nombre,
    apellido: reserva.apellido,
    email: reserva.email,
    telefono: reserva.telefono,
    personas: reserva.personas,
    fecha: reserva.fecha,
    hora: reserva.hora.slice(0, 5),
    notas_cliente: reserva.notas_cliente ?? "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const whatsappNumber = reserva.telefono.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;
  const isClosed = reserva.estado === "cancelada" || reserva.estado === "rechazada";

  async function handleEstado(estado: Reserva["estado"]) {
    setLoading(estado);
    const result = await updateEstadoReserva(reserva.id, estado);
    if (result.ok) onUpdate(reserva.id, { estado });
    setLoading(null);
    setConfirmCancel(false);
  }

  async function handleSaveNotas() {
    setSaving(true);
    const result = await updateNotasInternas(reserva.id, notas);
    if (result.ok) onUpdate(reserva.id, { notas_internas: notas || null });
    setSaving(false);
  }

  async function handleSaveEdit() {
    setEditSaving(true);
    setEditError(null);
    const result = await updateReserva(reserva.id, {
      nombre: editData.nombre.trim(),
      apellido: editData.apellido.trim(),
      email: editData.email.trim().toLowerCase(),
      telefono: editData.telefono.trim(),
      personas: Number(editData.personas),
      fecha: editData.fecha,
      hora: editData.hora,
      notas_cliente: editData.notas_cliente.trim() || null,
    });
    if (result.ok) {
      onUpdate(reserva.id, {
        nombre: editData.nombre.trim(),
        apellido: editData.apellido.trim(),
        email: editData.email.trim().toLowerCase(),
        telefono: editData.telefono.trim(),
        personas: Number(editData.personas),
        fecha: editData.fecha,
        hora: editData.hora + ":00",
        notas_cliente: editData.notas_cliente.trim() || null,
      });
      setIsEditing(false);
    } else {
      const errorMessages: Record<string, string> = {
        not_found: "Reserva no encontrada.",
        fecha_past: "La fecha no puede ser en el pasado.",
        dia_cerrado: "El restaurante está cerrado ese día.",
        franja_bloqueada: "Esa franja horaria no está disponible.",
      };
      setEditError(errorMessages[result.error ?? ""] ?? "Error al guardar. Inténtalo de nuevo.");
    }
    setEditSaving(false);
  }

  async function handleApprove() {
    setLoading("approve");
    const result = await approveReserva(reserva.id);
    if (result.ok) onUpdate(reserva.id, { estado: "confirmada" });
    setLoading(null);
  }

  async function handleReject() {
    setLoading("reject");
    const result = await rejectReserva(reserva.id);
    if (result.ok) onUpdate(reserva.id, { estado: "rechazada" });
    setLoading(null);
    setConfirmReject(false);
  }

  const isPending = reserva.estado === "pendiente_aprobacion";
  const status = STATUS_CONFIG[reserva.estado] ?? STATUS_CONFIG.confirmada;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:bg-black/40 bg-white text-gray-900">
    <div className="w-full lg:max-w-2xl lg:rounded-2xl lg:shadow-2xl lg:max-h-[90vh] bg-white text-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <Button variant="ghost" size="icon" onClick={onClose} className="admin-btn text-gray-700 hover:bg-gray-100 shrink-0">
          <X className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {reserva.nombre} {reserva.apellido}
          </h2>
          <p className="text-sm text-gray-500">
            {formatTime(reserva.hora)} · {reserva.personas} pers.
          </p>
        </div>
        <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium shrink-0", status.className)}>
          {status.label}
        </span>
        {!isClosed && !isEditing && (
          <Button
            variant="ghost" size="icon"
            className="admin-btn text-gray-500 hover:bg-gray-100 shrink-0"
            onClick={() => setIsEditing(true)}
            aria-label="Editar reserva"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-5">

        {isEditing ? (
          /* ── EDIT MODE ── */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={editData.nombre}
                  onChange={e => setEditData(d => ({ ...d, nombre: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Apellido</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={editData.apellido}
                  onChange={e => setEditData(d => ({ ...d, apellido: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</label>
              <input
                type="tel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={editData.telefono}
                onChange={e => setEditData(d => ({ ...d, telefono: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={editData.email}
                onChange={e => setEditData(d => ({ ...d, email: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</label>
                <input
                  type="date"
                  min={todayBarcelona()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={editData.fecha}
                  onChange={e => setEditData(d => ({ ...d, fecha: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hora</label>
                <input
                  type="time"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={editData.hora}
                  onChange={e => setEditData(d => ({ ...d, hora: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Personas</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={editData.personas}
                  onChange={e => setEditData(d => ({ ...d, personas: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notas del cliente</label>
              <Textarea
                value={editData.notas_cliente}
                onChange={e => setEditData(d => ({ ...d, notas_cliente: e.target.value }))}
                rows={2}
                className="text-sm text-gray-900 border-gray-300"
                placeholder="Sin notas"
              />
            </div>

            {editError && <p className="text-sm text-red-600">{editError}</p>}
          </div>
        ) : (
          /* ── VIEW MODE ── */
          <>
            {/* Pending approval banner */}
            {isPending && (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-700 shrink-0" />
                  <p className="text-sm font-semibold text-amber-900">
                    Grupo grande — pendiente de aprobación
                  </p>
                </div>
                <p className="text-xs text-amber-700 pl-6">
                  {reserva.personas} personas · El cliente está esperando confirmación
                </p>
              </div>
            )}

            {/* Contact */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <a href={`tel:${reserva.telefono}`} className="flex-1">
                  <Button variant="outline" size="lg" className="w-full admin-btn gap-2 text-gray-700 border-gray-300">
                    <Phone className="h-5 w-5" />
                    Llamar
                  </Button>
                </a>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" size="lg" className="w-full admin-btn gap-2 text-gray-700 border-gray-300">
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp
                  </Button>
                </a>
              </div>
              <div className="flex items-center justify-between">
                <a href={`mailto:${reserva.email}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  {reserva.email}
                </a>
                {reserva.cliente_id && (
                  <a
                    href={`/admin/clientes/${reserva.cliente_id}`}
                    className="text-xs text-gray-400 hover:text-gray-900 transition-colors shrink-0 ml-3"
                  >
                    Ver perfil →
                  </a>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-2.5 text-sm">
              {[
                ["Fecha", reserva.fecha],
                ["Hora", formatTime(reserva.hora)],
                ["Personas", String(reserva.personas)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>

            {/* Notas cliente */}
            {reserva.notas_cliente && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notas del cliente</p>
                <p className="text-sm text-gray-700 rounded-lg bg-gray-50 border border-gray-200 p-3">
                  {reserva.notas_cliente}
                </p>
              </div>
            )}

            {/* Notas internas */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notas internas</p>
              <Textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Sin notas"
                rows={3}
                className="text-sm text-gray-900 border-gray-300"
              />
              <Button
                variant="outline" size="sm"
                onClick={handleSaveNotas}
                disabled={saving}
                className="gap-2 text-gray-700 border-gray-300"
              >
                <Save className="h-4 w-4" />
                {saving ? "Guardando..." : "Guardar notas"}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t border-gray-200 space-y-3 bg-white">
        {isEditing ? (
          <div className="flex gap-2">
            <Button
              size="lg"
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white admin-btn gap-2"
              onClick={handleSaveEdit}
              disabled={editSaving}
            >
              <Save className="h-5 w-5" />
              {editSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 admin-btn text-gray-700 border-gray-300"
              onClick={() => { setIsEditing(false); setEditError(null); }}
            >
              Cancelar
            </Button>
          </div>
        ) : isPending ? (
          /* ── PENDING APPROVAL ACTIONS ── */
          <>
            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white admin-btn gap-2"
              onClick={handleApprove}
              disabled={loading !== null}
            >
              <ThumbsUp className="h-5 w-5" />
              {loading === "approve" ? "Confirmando..." : "Aprobar reserva"}
            </Button>
            {confirmReject ? (
              <div className="flex gap-2">
                <Button
                  size="lg"
                  variant="destructive"
                  className="flex-1 admin-btn"
                  onClick={handleReject}
                  disabled={loading === "reject"}
                >
                  <ThumbsDown className="h-4 w-4" />
                  {loading === "reject" ? "..." : "Confirmar rechazo"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 admin-btn text-gray-700 border-gray-300"
                  onClick={() => setConfirmReject(false)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                variant="outline"
                className="w-full admin-btn gap-2 text-gray-500 border-gray-200 hover:border-gray-300"
                onClick={() => setConfirmReject(true)}
                disabled={loading !== null}
              >
                <ThumbsDown className="h-4 w-4" />
                Rechazar reserva
              </Button>
            )}
          </>
        ) : (
          !isClosed && (
            <>
              {reserva.estado !== "llegado" && (
                <Button
                  size="lg"
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
                  size="lg"
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
                  <Button size="lg" variant="outline" className="flex-1 admin-btn text-gray-700 border-gray-300" onClick={() => setConfirmCancel(false)}>
                    No cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full admin-btn gap-2 text-gray-500 border-gray-200 hover:border-gray-300"
                  onClick={() => setConfirmCancel(true)}
                >
                  <Ban className="h-4 w-4" />
                  Cancelar reserva
                </Button>
              )}
            </>
          )
        )}
      </div>
    </div>
    </div>
  );
}
