"use client";

import { useState } from "react";
import { X, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDiaCerrado, removeDiaCerrado } from "@/actions/ajustes";
import type { DiaCerrado } from "@/lib/supabase/types";

interface Props {
  initial: DiaCerrado[];
}

function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AjustesDias({ initial }: Props) {
  const [dias, setDias] = useState(initial);
  const [newFecha, setNewFecha] = useState("");
  const [newMotivo, setNewMotivo] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleAdd() {
    if (!newFecha) return;
    setAdding(true);
    setError(null);
    const result = await addDiaCerrado(newFecha, newMotivo || undefined);
    if (result.ok) {
      const optimistic: DiaCerrado = {
        id: crypto.randomUUID(),
        fecha: newFecha,
        motivo: newMotivo || null,
        created_at: new Date().toISOString(),
      };
      setDias((prev) =>
        [...prev, optimistic].sort((a, b) => a.fecha.localeCompare(b.fecha))
      );
      setNewFecha("");
      setNewMotivo("");
    } else {
      setError(
        result.error === "duplicate"
          ? "Este día ya está marcado como cerrado."
          : "Error al añadir. Inténtalo de nuevo."
      );
    }
    setAdding(false);
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    const result = await removeDiaCerrado(id);
    if (result.ok) setDias((prev) => prev.filter((d) => d.id !== id));
    setRemoving(null);
  }

  return (
    <div className="space-y-3">
      {/* Add form */}
      <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Añadir día cerrado
        </p>
        <input
          type="date"
          value={newFecha}
          onChange={(e) => { setNewFecha(e.target.value); setError(null); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <input
          type="text"
          placeholder="Motivo (opcional) — ej. vacaciones, festivo"
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
          {adding ? "Añadiendo..." : "Añadir día cerrado"}
        </Button>
      </div>

      {/* List */}
      {dias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <Calendar className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No hay días cerrados programados</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
          {dias.map((dia, i) => (
            <div
              key={dia.id}
              className={[
                "flex items-center justify-between px-4 py-3",
                i < dias.length - 1 ? "border-b border-gray-100" : "",
              ].join(" ")}
            >
              <div>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {formatFecha(dia.fecha)}
                </p>
                {dia.motivo && (
                  <p className="text-xs text-gray-500 mt-0.5">{dia.motivo}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(dia.id)}
                disabled={removing === dia.id}
                className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 shrink-0"
                aria-label="Eliminar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
