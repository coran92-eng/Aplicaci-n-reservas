"use client";

import { useState } from "react";
import { X, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addFranjaBloqueada, removeFranjaBloqueada } from "@/actions/ajustes";
import { generateTimeSlots } from "@/lib/utils";
import type { FranjaBloqueada } from "@/lib/supabase/types";

interface Props {
  initial: FranjaBloqueada[];
}

const TIME_SLOTS = generateTimeSlots();

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function AjustesFranjas({ initial }: Props) {
  const [franjas, setFranjas] = useState(initial);
  const [newFecha, setNewFecha] = useState("");
  const [newHora, setNewHora] = useState(TIME_SLOTS[0] ?? "13:00");
  const [newMotivo, setNewMotivo] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleAdd() {
    if (!newFecha) return;
    setAdding(true);
    setError(null);
    const result = await addFranjaBloqueada(newFecha, newHora, newMotivo || undefined);
    if (result.ok) {
      const optimistic: FranjaBloqueada = {
        id: crypto.randomUUID(),
        fecha: newFecha,
        hora: newHora + ":00",
        motivo: newMotivo || null,
        created_at: new Date().toISOString(),
      };
      setFranjas((prev) =>
        [...prev, optimistic].sort(
          (a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora)
        )
      );
      setNewFecha("");
      setNewMotivo("");
    } else {
      setError(
        result.error === "duplicate"
          ? "Esta franja ya está bloqueada."
          : "Error al bloquear. Inténtalo de nuevo."
      );
    }
    setAdding(false);
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    const result = await removeFranjaBloqueada(id);
    if (result.ok) setFranjas((prev) => prev.filter((f) => f.id !== id));
    setRemoving(null);
  }

  // Group by date
  const grouped = franjas.reduce<Record<string, FranjaBloqueada[]>>((acc, f) => {
    if (!acc[f.fecha]) acc[f.fecha] = [];
    acc[f.fecha].push(f);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-3">
      {/* Add form */}
      <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Bloquear franja horaria
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={newFecha}
            onChange={(e) => { setNewFecha(e.target.value); setError(null); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <select
            value={newHora}
            onChange={(e) => setNewHora(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          >
            {TIME_SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          placeholder="Motivo (opcional) — ej. evento privado"
          value={newMotivo}
          onChange={(e) => setNewMotivo(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button
          size="sm"
          disabled={!newFecha || adding}
          onClick={handleAdd}
          className="gap-1.5 bg-gray-900 text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          {adding ? "Bloqueando..." : "Bloquear franja"}
        </Button>
      </div>

      {/* List grouped by date */}
      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <Clock className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No hay franjas bloqueadas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedDates.map((fecha) => (
            <div
              key={fecha}
              className="rounded-lg border border-gray-200 overflow-hidden bg-white"
            >
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 capitalize">
                  {formatFecha(fecha)}
                </p>
              </div>
              <div>
                {grouped[fecha].map((franja, i) => (
                  <div
                    key={franja.id}
                    className={[
                      "flex items-center justify-between px-4 py-2.5",
                      i < grouped[fecha].length - 1 ? "border-b border-gray-100" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-gray-900 w-10">
                        {franja.hora.slice(0, 5)}
                      </span>
                      {franja.motivo && (
                        <span className="text-xs text-gray-500">{franja.motivo}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(franja.id)}
                      disabled={removing === franja.id}
                      className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 shrink-0"
                      aria-label="Eliminar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
