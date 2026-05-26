"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronRight, Users, AlertCircle, Volume2, VolumeX, CheckCheck } from "lucide-react";
import { cn, formatTime, todayBarcelona, nowBarcelona } from "@/lib/utils";
import { ReservationModal } from "./ReservationModal";
import type { Reserva } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { updateEstadoReserva } from "@/actions/reservas";

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

function playNotificationBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    osc.onended = () => ctx.close();
  } catch { /* Web Audio unavailable */ }
}

interface Props {
  reservas: Reserva[];
  currentDate: string;
}

export function ReservationList({ reservas: initialReservas, currentDate }: Props) {
  const [reservas, setReservas] = useState(initialReservas);
  const [selected, setSelected] = useState<Reserva | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => nowBarcelona());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [markingArrived, setMarkingArrived] = useState<string | null>(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  useEffect(() => {
    const saved = localStorage.getItem("admin_sound") === "1";
    setSoundEnabled(saved);
  }, []);

  function toggleSound() {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("admin_sound", next ? "1" : "0");
      if (next) playNotificationBeep();
      return next;
    });
  }

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
          if (soundEnabledRef.current) playNotificationBeep();
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

  const markArrived = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMarkingArrived(id);
    // Capture current state before optimistic update for rollback
    let prevEstado: Reserva["estado"] = "confirmada";
    setReservas((prev) => {
      const found = prev.find((r) => r.id === id);
      if (found) prevEstado = found.estado;
      return prev.map((r) => (r.id === id ? { ...r, estado: "llegado" } : r));
    });
    await updateEstadoReserva(id, "llegado").catch(() => {
      setReservas((prev) => prev.map((r) => (r.id === id ? { ...r, estado: prevEstado } : r)));
    });
    setMarkingArrived(null);
  }, []);

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
      {/* Sound toggle */}
      <div className="flex justify-end px-4 py-2 border-b">
        <button
          type="button"
          onClick={toggleSound}
          title={soundEnabled ? "Desactivar sonido de alertas" : "Activar sonido de alertas"}
          className={cn(
            "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors",
            soundEnabled
              ? "bg-green-50 text-green-700 border border-green-200"
              : "text-gray-400 hover:text-gray-600 border border-transparent hover:border-gray-200"
          )}
        >
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          {soundEnabled ? "Sonido activo" : "Sin sonido"}
        </button>
      </div>

      <div className="divide-y">
        {sorted.map((reserva) => {
          const status = STATUS_CONFIG[reserva.estado] ?? STATUS_CONFIG.confirmada;
          const isCancelled =
            reserva.estado === "cancelada" || reserva.estado === "rechazada";
          const isNew = newIds.has(reserva.id);
          const late = isLate(reserva);
          const isConfirmada = reserva.estado === "confirmada";

          return (
            <div
              key={reserva.id}
              className={cn(
                "flex items-center gap-4 px-4 py-3 transition-colors",
                status.row,
                isNew && "!bg-yellow-50 border-l-4 border-l-yellow-400",
                late && "!bg-red-50 border-l-4 border-l-red-500"
              )}
            >
              {/* Row clickable area */}
              <button
                onClick={() => setSelected(reserva)}
                className="flex items-center gap-4 flex-1 min-w-0 text-left"
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
                    {reserva.reconfirmado && reserva.estado === "confirmada" && (
                      <span className="hidden sm:inline text-xs font-semibold text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 leading-none">
                        ✓ Conf.
                      </span>
                    )}
                  </span>
                )}

                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              </button>

              {/* Quick "ha llegado" action — only for confirmada */}
              {isConfirmada && (
                <button
                  type="button"
                  onClick={(e) => markArrived(reserva.id, e)}
                  disabled={markingArrived === reserva.id}
                  title="Marcar como llegado"
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-green-100 hover:bg-green-200 text-green-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
            </div>
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
