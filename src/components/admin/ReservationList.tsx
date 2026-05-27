"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronRight,
  Users,
  AlertCircle,
  Volume2,
  VolumeX,
  CheckCheck,
} from "lucide-react";
import { cn, formatTime, todayBarcelona, nowBarcelona } from "@/lib/utils";
import { ReservationModal } from "./ReservationModal";
import type { Reserva } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { updateEstadoReserva } from "@/actions/reservas";

// ─── Status configuration ────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  border: string;
  badge: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  confirmada: {
    label: "Confirmada",
    border: "border-l-4 border-l-green-500",
    badge: "bg-green-50 text-green-700 border border-green-200",
  },
  llegado: {
    label: "Ha llegado",
    border: "border-l-4 border-l-blue-500",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  pendiente_aprobacion: {
    label: "Pendiente",
    border: "border-l-4 border-l-amber-400",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  cancelada: {
    label: "Cancelada",
    border: "border-l-4 border-l-gray-200",
    badge: "bg-gray-100 text-gray-400",
  },
  no_show: {
    label: "No show",
    border: "border-l-4 border-l-red-500",
    badge: "bg-red-50 text-red-600 border border-red-200",
  },
  rechazada: {
    label: "Rechazada",
    border: "border-l-4 border-l-gray-200",
    badge: "bg-gray-100 text-gray-400",
  },
};

// ─── Audio ────────────────────────────────────────────────────────────────────

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
  } catch {
    /* Web Audio unavailable */
  }
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  label,
  count,
  personas,
}: {
  label: string;
  count: number;
  personas: number;
}) {
  return (
    <div className="px-4 pt-5 pb-2 flex items-center gap-3">
      <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-400 whitespace-nowrap">
        {label} · {count} {count === 1 ? "reserva" : "reservas"} · {personas}{" "}
        {personas === 1 ? "persona" : "personas"}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  reservas: Reserva[];
  currentDate: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReservationList({
  reservas: initialReservas,
  currentDate,
}: Props) {
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

  const markArrived = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setMarkingArrived(id);
      // Capture current state before optimistic update for rollback
      let prevEstado: Reserva["estado"] = "confirmada";
      setReservas((prev) => {
        const found = prev.find((r) => r.id === id);
        if (found) prevEstado = found.estado;
        return prev.map((r) =>
          r.id === id ? { ...r, estado: "llegado" } : r
        );
      });
      await updateEstadoReserva(id, "llegado").catch(() => {
        setReservas((prev) =>
          prev.map((r) => (r.id === id ? { ...r, estado: prevEstado } : r))
        );
      });
      setMarkingArrived(null);
    },
    []
  );

  const isToday = currentDate === todayBarcelona();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  function isLate(reserva: Reserva): boolean {
    if (!isToday || reserva.estado !== "confirmada") return false;
    const [hh, mm] = reserva.hora.split(":").map(Number);
    return hh * 60 + mm + 15 < nowMinutes;
  }

  // Sort: midnight slots last, then alphabetical by time
  const sorted = [...reservas].sort((a, b) => {
    const aH = a.hora.slice(0, 5);
    const bH = b.hora.slice(0, 5);
    const aIsNight = aH.startsWith("00:");
    const bIsNight = bH.startsWith("00:");
    if (aIsNight && !bIsNight) return 1;
    if (!aIsNight && bIsNight) return -1;
    return aH.localeCompare(bH);
  });

  // ── Derived totals (exclude cancelled/rejected) ──────────────────────────
  const activeReservas = reservas.filter(
    (r) => r.estado !== "cancelada" && r.estado !== "rechazada"
  );
  const totalReservas = activeReservas.length;
  const totalPersonas = activeReservas.reduce((sum, r) => sum + r.personas, 0);

  // ── Split into sections ──────────────────────────────────────────────────
  const almuerzo = sorted.filter((r) => {
    const h = r.hora.slice(0, 5);
    return !h.startsWith("00:") && h < "17:00";
  });
  const cena = sorted.filter((r) => {
    const h = r.hora.slice(0, 5);
    return !h.startsWith("00:") && h >= "17:00";
  });
  const madrugada = sorted.filter((r) => r.hora.slice(0, 5).startsWith("00:"));

  const almuerzoPersonas = almuerzo.reduce((s, r) => s + r.personas, 0);
  const cenaPersonas = cena.reduce((s, r) => s + r.personas, 0);
  const madrugadaPersonas = madrugada.reduce((s, r) => s + r.personas, 0);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (reservas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-gray-300" />
        </div>
        <p className="text-gray-900 font-semibold text-lg">Sin reservas</p>
        <p className="text-gray-400 text-sm mt-1">
          No hay reservas para este día
        </p>
      </div>
    );
  }

  // ── Render a single reservation card ────────────────────────────────────
  function ReservationCard({ reserva }: { reserva: Reserva }) {
    const status = STATUS_CONFIG[reserva.estado] ?? STATUS_CONFIG.confirmada;
    const isCancelled =
      reserva.estado === "cancelada" || reserva.estado === "rechazada";
    const isNew = newIds.has(reserva.id);
    const late = isLate(reserva);
    const isConfirmada = reserva.estado === "confirmada";

    return (
      <div className="mx-3 mb-2">
        <div
          className={cn(
            "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden",
            status.border,
            isNew && "ring-2 ring-amber-400 ring-offset-1",
            late && !isNew && "ring-2 ring-red-500"
          )}
        >
          {/* Main button — opens modal */}
          <button
            type="button"
            onClick={() => setSelected(reserva)}
            className="w-full flex items-center gap-4 px-4 py-4 text-left"
          >
            {/* Time */}
            <span
              className={cn(
                "text-[22px] font-bold tabular-nums w-16 shrink-0",
                isCancelled ? "line-through text-gray-400" : "text-gray-900"
              )}
            >
              {formatTime(reserva.hora)}
            </span>

            {/* Name + phone + notes */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-[15px] font-semibold truncate",
                  isCancelled ? "line-through text-gray-400" : "text-gray-900"
                )}
              >
                {reserva.nombre} {reserva.apellido}
              </p>
              {!isCancelled && reserva.telefono && (
                <p className="text-sm text-gray-400 mt-0.5 truncate">
                  {reserva.telefono}
                </p>
              )}
              {!isCancelled && reserva.notas_cliente && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 line-clamp-2 leading-snug">
                  {reserva.notas_cliente}
                </p>
              )}
            </div>

            {/* Right column: guests + badge + reconfirmed */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {/* Guests */}
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <Users className="h-4 w-4" />
                {reserva.personas}p
              </span>

              {/* Late badge or status badge */}
              {late ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                  <AlertCircle className="h-3 w-3" />
                  Retraso
                </span>
              ) : (
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    status.badge
                  )}
                >
                  {status.label}
                </span>
              )}

              {/* Reconfirmed badge — only for confirmada */}
              {reserva.reconfirmado && reserva.estado === "confirmada" && (
                <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 leading-none">
                  ✓ Conf.
                </span>
              )}
            </div>

            <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
          </button>

          {/* "Ha llegado" button — only for confirmada */}
          {isConfirmada && (
            <div className="border-t border-gray-50 px-4 py-2.5">
              <button
                type="button"
                onClick={(e) => markArrived(reserva.id, e)}
                disabled={markingArrived === reserva.id}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 active:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                Ha llegado
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Top bar: totals + sound toggle ─────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs text-gray-400">
          {totalReservas} {totalReservas === 1 ? "reserva" : "reservas"} ·{" "}
          {totalPersonas} {totalPersonas === 1 ? "persona" : "personas"}
        </span>
        <button
          type="button"
          onClick={toggleSound}
          className={cn(
            "flex items-center gap-2 h-9 px-3 rounded-xl text-sm font-medium transition-colors",
            soundEnabled
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          )}
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
          {soundEnabled ? "Sonido activo" : "Sin sonido"}
        </button>
      </div>

      {/* ── Almuerzo section ─────────────────────────────────────────────── */}
      {almuerzo.length > 0 && (
        <section>
          <SectionHeader
            label="Almuerzo"
            count={almuerzo.length}
            personas={almuerzoPersonas}
          />
          {almuerzo.map((reserva) => (
            <ReservationCard key={reserva.id} reserva={reserva} />
          ))}
        </section>
      )}

      {/* ── Cena section ─────────────────────────────────────────────────── */}
      {cena.length > 0 && (
        <section>
          <SectionHeader
            label="Cena"
            count={cena.length}
            personas={cenaPersonas}
          />
          {cena.map((reserva) => (
            <ReservationCard key={reserva.id} reserva={reserva} />
          ))}
        </section>
      )}

      {/* ── Madrugada section ────────────────────────────────────────────── */}
      {madrugada.length > 0 && (
        <section>
          <SectionHeader
            label="Madrugada"
            count={madrugada.length}
            personas={madrugadaPersonas}
          />
          {madrugada.map((reserva) => (
            <ReservationCard key={reserva.id} reserva={reserva} />
          ))}
        </section>
      )}

      {/* ── Modal ────────────────────────────────────────────────────────── */}
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
