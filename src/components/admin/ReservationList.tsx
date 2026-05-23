"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Users, AlertCircle } from "lucide-react";
import { cn, formatTime, todayBarcelona, nowBarcelona } from "@/lib/utils";
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
  currentDate: string;
}

export function ReservationList({ reservas: initialReservas, currentDate }: Props) {
  const [reservas, setReservas] = useState(initialReservas);
  const [selected, setSelected] = useState<Reserva | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => nowBarcelona());

  // Keep `now` fresh for late-arrival alerts (only matters when viewing today)
  useEffect(() => {
    if (currentDate !== todayBarcelona()) return;
    const id = setInterval(() => setNow(nowBarcelona()), 30_000);
    return () => clearInterval(id);
  }, [currentDate]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`admin-reservas-${currentDate}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reservas",
          filter: `fecha=eq.${currentDate}`,
        },
        (payload) => {
          const nueva = payload.new as Reserva;
          setReservas((prev) => {
            if (prev.some((r) => r.id === nueva.id)) return prev;
            return [...prev, nueva];
          });
          setNewIds((prev) => new Set([...prev, nueva.id]));
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              next.delete(nueva.id);
              return next;
            });
          }, 30_000);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "reservas",
          filter: `fecha=eq.${currentDate}`,
        },
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
  }, [currentDate]);

  function handleUpdate(id: string, updates: Partial<Reserva>) {
    setReservas((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    if (selected?.id === id) {
      setSelected((prev) => (prev ? { ...prev, ...updates } : null));
    }
  }

  const isToday = currentDate === todayBarcelona();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  function isLate(reserva: Reserva): boolean {
    if (!isToday || reserva.estado !== "confirmada") return false;
    const [hh, mm] = reserva.hora.split(":").map(Number);
    return hh * 60 + mm + 15 < nowMinutes;
  }

  const sorted = [...reservas].sort((a, b) => {
    const aH = a.hora.slice(0, 5);
    const bH = b.hora.slice(0, 5);
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
          const isCancelled =
            reserva.estado === "cancelada" || reserva.estado === "rechazada";
          const isNew = newIds.has(reserva.id);
          const late = isLate(reserva);

          return (
            <button
              key={reserva.id}
              onClick={() => setSelected(reserva)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3 text-left transition-colors",
                status.row,
                isNew && "!bg-yellow-50 border-l-4 border-l-yellow-400",
                late && "!bg-red-50 border-l-4 border-l-red-500"
              )}
            >
              {/* Hora */}
              <span className={cn("text-2xl font-bold tabular-nums w-14 shrink-0", isCancelled ? "line-through text-gray-400" : "text-gray-900")}>
                {formatTime(reserva.hora)}
              </span>

              {/* Nombre + teléfono */}
              <span className="flex-1 min-w-0">
                <span className={cn("block text-base font-medium truncate", isCancelled ? "text-gray-400" : "text-gray-700")}>
                  {reserva.nombre} {reserva.apellido}
                </span>
                {!isCancelled && reserva.telefono && (
                  <span className="block text-xs text-gray-400 truncate mt-0.5">
                    {reserva.telefono}
                  </span>
                )}
              </span>

              {/* Personas */}
              <span className="flex items-center gap-1 text-sm text-gray-500 shrink-0">
                <Users className="h-4 w-4" />
                {reserva.personas}
              </span>

              {/* Late alert or Estado */}
              {late ? (
                <span className="flex items-center gap-1 text-sm text-red-600 font-medium shrink-0">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Retraso</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm">
                  <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", status.dot)} />
                  <span className={cn("hidden sm:inline text-gray-600", isCancelled && "line-through text-gray-400")}>
                    {status.label}
                  </span>
                </span>
              )}

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
