"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createWalkin } from "@/actions/reservas";

interface Props {
  defaultDate: string;
  onClose: () => void;
  onCreated: () => void;
}

export function WalkinModal({ defaultDate, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    personas: 2,
    fecha: defaultDate,
    hora: "",
    notas_cliente: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.telefono.trim() || !form.hora) {
      setError("Nombre, teléfono y hora son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createWalkin({
      nombre: form.nombre,
      apellido: form.apellido,
      telefono: form.telefono,
      email: form.email || undefined,
      personas: form.personas,
      fecha: form.fecha,
      hora: form.hora,
      notas_cliente: form.notas_cliente || undefined,
    });
    setSaving(false);
    if (result.ok) {
      onCreated();
    } else {
      setError("Error al registrar el walk-in. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:bg-black/40 bg-white text-gray-900">
      <div className="w-full lg:max-w-lg lg:rounded-2xl lg:shadow-2xl bg-white text-gray-900 flex flex-col overflow-hidden lg:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Button variant="ghost" size="icon" onClick={onClose} className="admin-btn text-gray-700 hover:bg-gray-100 shrink-0">
            <X className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-bold text-gray-900">Nuevo walk-in</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={form.nombre}
                onChange={e => set("nombre", e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Apellido</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={form.apellido}
                onChange={e => set("apellido", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono *</label>
            <input
              type="tel"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={form.telefono}
              onChange={e => set("telefono", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email (opcional)</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={form.email}
              onChange={e => set("email", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha *</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={form.fecha}
                onChange={e => set("fecha", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hora *</label>
              <input
                type="time"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={form.hora}
                onChange={e => set("hora", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Personas *</label>
              <input
                type="number"
                min={1}
                max={50}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={form.personas}
                onChange={e => set("personas", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notas (opcional)</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              value={form.notas_cliente}
              onChange={e => set("notas_cliente", e.target.value)}
              placeholder="Alergias, peticiones..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <Button
              type="submit"
              size="lg"
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white admin-btn"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? "Registrando..." : "Registrar walk-in"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="flex-1 admin-btn text-gray-700 border-gray-300"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
