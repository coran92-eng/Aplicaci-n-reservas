"use client";

import { useState } from "react";
import { ShieldOff, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cierreRapido, reaperturaRapida } from "@/actions/ajustes";
import { todayBarcelona } from "@/lib/utils";

export function AjustesCierreRapido() {
  const today = todayBarcelona();
  const [fecha, setFecha] = useState(today);
  const [loading, setLoading] = useState<"cierre" | "reabrir" | null>(null);
  const [result, setResult] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function handleCierre() {
    if (!confirm) {
      setConfirm(true);
      setResult(null);
      return;
    }
    setLoading("cierre");
    setResult(null);
    const res = await cierreRapido(fecha);
    if (res.ok) {
      setResult({
        msg:
          res.count === 0
            ? "Todas las franjas ya estaban bloqueadas."
            : `${res.count} franjas bloqueadas correctamente. No entrarán nuevas reservas online.`,
        ok: true,
      });
    } else {
      setResult({ msg: "Error al bloquear. Inténtalo de nuevo.", ok: false });
    }
    setLoading(null);
    setConfirm(false);
  }

  async function handleReabrir() {
    setLoading("reabrir");
    setResult(null);
    const res = await reaperturaRapida(fecha);
    if (res.ok) {
      setResult({
        msg:
          res.count === 0
            ? "No había franjas de cierre rápido activas."
            : `${res.count} franjas reabertas. Las reservas online vuelven a estar activas.`,
        ok: true,
      });
    } else {
      setResult({ msg: "Error al reabrir. Inténtalo de nuevo.", ok: false });
    }
    setLoading(null);
  }

  return (
    <div className="p-4 rounded-xl border-2 border-amber-200 bg-amber-50 space-y-4">
      <div>
        <p className="text-sm font-semibold text-amber-900">Cierre de emergencia</p>
        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
          Bloquea todas las franjas horarias de un día de golpe para cortar nuevas reservas
          online al instante. Las reservas ya confirmadas{" "}
          <strong>no se cancelan</strong>.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={fecha}
          min={today}
          onChange={(e) => {
            setFecha(e.target.value);
            setConfirm(false);
            setResult(null);
          }}
          className="border border-amber-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        {fecha === today && (
          <span className="text-xs text-amber-700 font-medium">Hoy</span>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {confirm ? (
          <>
            <Button
              size="sm"
              className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCierre}
              disabled={loading === "cierre"}
            >
              <ShieldOff className="h-4 w-4" />
              {loading === "cierre" ? "Bloqueando..." : "Confirmar cierre"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-gray-700 border-gray-300 bg-white"
              onClick={() => setConfirm(false)}
            >
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              className="gap-1.5 bg-amber-700 hover:bg-amber-800 text-white"
              onClick={handleCierre}
              disabled={loading !== null}
            >
              <ShieldOff className="h-4 w-4" />
              Cerrar todas las franjas
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-gray-700 border-gray-300 bg-white hover:bg-gray-50"
              onClick={handleReabrir}
              disabled={loading !== null}
            >
              <Unlock className="h-3.5 w-3.5" />
              {loading === "reabrir" ? "Reabriendo..." : "Reabrir"}
            </Button>
          </>
        )}
      </div>

      {confirm && (
        <p className="text-xs font-medium text-red-700">
          ¿Seguro? Esto bloqueará todas las franjas del día seleccionado.
        </p>
      )}

      {result && (
        <p className={["text-xs font-medium", result.ok ? "text-amber-800" : "text-red-700"].join(" ")}>
          {result.msg}
        </p>
      )}
    </div>
  );
}
