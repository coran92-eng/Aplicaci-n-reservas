"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Users } from "lucide-react";
import { cn, formatTime, getInitials } from "@/lib/utils";
import { ReservationModal } from "./ReservationModal";
import type { Reserva } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; row: string; text: string }
> = {
  confirmada: {
    label: "Confirmada",
    dot: "bg-gray-400",
    row: "bg-white hover:bg-gray-50",
    text: "text-gray-900",
  },
  llegado: {
    label: "Ha llegado",
    dot: "bg-green-500",
    row: "bg-green-50 hover:bg-green-100",
    text: "text-green-900",
  },
  no_show: {
    label: "No show",
    dot: "bg-red-500",
    row: "bg-red-50",
    text: "text-red-900",
  },
  cancelada: {
    label: "Cancelada",
    dot: "bg-gray-300",
    row: "bg-gray-50 opacity-60",
    text: "text-gray-400",
  },
  pendiente_aprobacion: {
    label: "Pendiente",
    dot: "bg-amber-400",
    row: "bg-amber-50 hover:bg-amber-100",
    text: "text-amber-900",
  },
  rechazada: {
    label: "Rechazada",
    dot: "bg-red-300",
    row: "bg-gray-50 opacity-60",
    text: "text-gray-400",
  },
};

interface Props {
  reservas: Reserva[];
}

export function ReservationList({ reservas: initialReservas }: Props) {
  const [reservas, setReservas] = useState(initialReservas);
  const [selected, setSelected] = useState<Reserva | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-reservas")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reservas" },
        (payload) => {
          const nueva = payload.new as Reserva;
          setReservas((prev) => {
            // Evitar duplicados
            if (prev.some((r) => r.id === nueva.id)) return prev;
            return [...prev, nueva];
          });
          // Flash visual — añadir a lista de nuevas
          setNewIds((prev) => new Set([...prev, nueva.id]));
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              next.delete(nueva.id);
              return next;
            });
          }, 30000); // Highlight 30 segundos
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservas" },
        (payload) => {
          const updated = payload.new as Reserva;
          setReservas((prev) =>
            prev.map((r) => (r.id === updated.id ? updated : r))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handleUpdate(id: string, updates: Partial<Reserva>) {
    setReservas((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    if (selected?.id === id) {
      setSelected((prev) => (prev ? { ...prev, ...updates } : null));
    }
  }

  const sorted = [...reservas].sort((a, b) => {
    const aH = a.hora.slice(0, 5);
    const bH = b.hora.slice(0, 5);
    // midnight slots (00:xx) come last
    const aIsNight = aH.startsWith("00:");
    const bIsNight = bH.startsWith("00:");
    if (aIsNight && !bIsNight) return 1;
    if (!aIsNight && bIsNight) return -1;
    return aH.localeCompare(bH);
  });

  if (reservas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Users className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg text-gray-500">No hay reservas para este día</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y">
        {sorted.map((reserva) => {
          const status = STATUS_CONFIG[reserva.estado] ?? STATUS_CONFIG.confirmada;
          const initials = getInitials(reserva.nombre, reserva.apellido);
          const isCancelled =
            reserva.estado === "cancelada" || reserva.estado === "rechazada";
          const isNew = newIds.has(reserva.id);

          return (
            <button
              key={reserva.id}
              onClick={() => setSelected(reserva)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-4 text-left transition-colors",
                status.row,
                isNew && "!bg-yellow-50 border-l-4 border-l-yellow-400"
              )}
            >
              {/* Hora */}
              <span className={cn("text-2xl font-bold tabular-nums w-14 shrink-0", isCancelled ? "line-through text-gray-400" : "text-gray-900")}>
                {formatTime(reserva.hora)}
              </span>

              {/* Iniciales */}
              <span className={cn("text-base font-medium w-12 shrink-0", isCancelled ? "text-gray-400" : "text-gray-700")}>
                {initials}
              </span>

              {/* Personas */}
              <span className="flex items-center gap-1 text-sm text-gray-500 flex-1">
                <Users className="h-4 w-4" />
                {reserva.personas}
              </span>

              {/* Estado */}
              <span className="flex items-center gap-1.5 text-sm">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", status.dot)} />
                <span className={cn("hidden sm:inline text-gray-600", isCancelled && "line-through text-gray-400")}>
                  {status.label}
                </span>
              </span>

              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
            </button>
          );
        })}
      </div>

      {selected && (
        <ReservationModal
          reserva={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </>
  );
}
