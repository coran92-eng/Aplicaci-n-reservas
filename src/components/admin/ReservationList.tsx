"use client";

import { useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import { cn, formatTime, getInitials } from "@/lib/utils";
import { ReservationModal } from "./ReservationModal";
import type { Reserva } from "@/lib/supabase/types";

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; row: string }
> = {
  confirmada: {
    label: "Confirmada",
    dot: "bg-gray-400",
    row: "bg-white hover:bg-gray-50",
  },
  llegado: {
    label: "Ha llegado",
    dot: "bg-green-500",
    row: "bg-green-50 hover:bg-green-100",
  },
  no_show: {
    label: "No show",
    dot: "bg-red-500",
    row: "bg-red-50 hover:bg-red-50",
  },
  cancelada: {
    label: "Cancelada",
    dot: "bg-gray-300",
    row: "bg-gray-50 opacity-60",
  },
  pendiente_aprobacion: {
    label: "Pendiente",
    dot: "bg-amber-400",
    row: "bg-amber-50 hover:bg-amber-100",
  },
  rechazada: {
    label: "Rechazada",
    dot: "bg-red-300",
    row: "bg-gray-50 opacity-60",
  },
};

interface Props {
  reservas: Reserva[];
}

export function ReservationList({ reservas: initialReservas }: Props) {
  const [reservas, setReservas] = useState(initialReservas);
  const [selected, setSelected] = useState<Reserva | null>(null);

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
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Users className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg">No hay reservas para este día</p>
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

          return (
            <button
              key={reserva.id}
              onClick={() => setSelected(reserva)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-4 text-left transition-colors",
                status.row
              )}
            >
              {/* Hora */}
              <span
                className={cn(
                  "text-2xl font-bold tabular-nums w-14 shrink-0",
                  isCancelled && "line-through text-muted-foreground"
                )}
              >
                {formatTime(reserva.hora)}
              </span>

              {/* Iniciales */}
              <span
                className={cn(
                  "text-base font-medium w-12 shrink-0",
                  isCancelled && "text-muted-foreground"
                )}
              >
                {initials}
              </span>

              {/* Personas */}
              <span className="flex items-center gap-1 text-sm text-muted-foreground flex-1">
                <Users className="h-4 w-4" />
                {reserva.personas}
              </span>

              {/* Estado */}
              <span className="flex items-center gap-1.5 text-sm">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", status.dot)} />
                <span
                  className={cn(
                    "hidden sm:inline",
                    isCancelled && "line-through text-muted-foreground"
                  )}
                >
                  {status.label}
                </span>
              </span>

              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
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
