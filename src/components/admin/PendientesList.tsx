"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Phone, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveReserva, rejectReserva } from "@/actions/reservas";
import { formatTime } from "@/lib/utils";
import type { Reserva } from "@/lib/supabase/types";

function formatDate(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "short", day: "numeric", month: "short",
  });
}

interface Props {
  reservas: Reserva[];
}

type CardState = "idle" | "approving" | "rejecting" | "done_ok" | "done_reject" | "error";

function PendienteCard({
  reserva,
}: {
  reserva: Reserva;
}) {
  const [state, setState] = useState<CardState>("idle");
  const [confirmReject, setConfirmReject] = useState(false);

  async function handleApprove() {
    setState("approving");
    const result = await approveReserva(reserva.id);
    setState(result.ok ? "done_ok" : "error");
  }

  async function handleReject() {
    setState("rejecting");
    const result = await rejectReserva(reserva.id);
    setState(result.ok ? "done_reject" : "error");
  }

  if (state === "done_ok") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-semibold text-green-700">
          ✓ Reserva aprobada — email de confirmación enviado a {reserva.nombre}
        </p>
      </div>
    );
  }

  if (state === "done_reject") {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 opacity-60">
        <p className="text-sm text-gray-500">
          Solicitud rechazada — {reserva.nombre} {reserva.apellido}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-gray-900">
            {reserva.nombre} {reserva.apellido}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="capitalize">{formatDate(reserva.fecha)}</span>
            {" · "}
            {formatTime(reserva.hora)}
          </p>
        </div>
        <span className="flex items-center gap-1 text-sm font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
          <Users className="h-3.5 w-3.5" />
          {reserva.personas}
        </span>
      </div>

      {/* Contact + meta */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <a
          href={`tel:${reserva.telefono}`}
          className="flex items-center gap-1 hover:text-gray-900"
        >
          <Phone className="h-3.5 w-3.5" />
          {reserva.telefono}
        </a>
        <span className="flex items-center gap-1 text-gray-400 text-xs">
          <Clock className="h-3 w-3" />
          {new Date(reserva.created_at).toLocaleDateString("es-ES", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </div>

      {reserva.notas_cliente && (
        <p className="text-sm text-gray-600 bg-white rounded-lg border border-amber-200 px-3 py-2">
          &ldquo;{reserva.notas_cliente}&rdquo;
        </p>
      )}

      {state === "error" && (
        <p className="text-sm text-red-600">Error. Inténtalo de nuevo.</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white admin-btn gap-1.5"
          onClick={handleApprove}
          disabled={state === "approving" || state === "rejecting"}
        >
          <ThumbsUp className="h-4 w-4" />
          {state === "approving" ? "Aprobando..." : "Aprobar"}
        </Button>

        {confirmReject ? (
          <div className="flex gap-1 flex-1">
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 admin-btn"
              onClick={handleReject}
              disabled={state === "rejecting"}
            >
              {state === "rejecting" ? "..." : "Confirmar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 admin-btn text-gray-700 border-gray-300"
              onClick={() => setConfirmReject(false)}
            >
              No
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 admin-btn gap-1.5 text-gray-500 border-gray-200"
            onClick={() => setConfirmReject(true)}
            disabled={state === "approving" || state === "rejecting"}
          >
            <ThumbsDown className="h-4 w-4" />
            Rechazar
          </Button>
        )}
      </div>
    </div>
  );
}

export function PendientesList({ reservas }: Props) {
  return (
    <div className="space-y-4">
      {reservas.map((r) => (
        <PendienteCard key={r.id} reserva={r} />
      ))}
    </div>
  );
}
