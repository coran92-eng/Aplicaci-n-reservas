"use client";

import { useState } from "react";
import { Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateConfiguracion } from "@/actions/ajustes";

interface Props {
  limiteGrupo: number;
  antelacionMax: number;
  topeActivo: boolean;
  topePersonas: number;
}

type ConfigKey =
  | "limite_grupo_online"
  | "antelacion_maxima_dias"
  | "tope_por_franja_activo"
  | "tope_por_franja_personas";

interface Values {
  limite_grupo_online: number;
  antelacion_maxima_dias: number;
  tope_por_franja_activo: boolean;
  tope_por_franja_personas: number;
}

export function AjustesConfig({ limiteGrupo, antelacionMax, topeActivo, topePersonas }: Props) {
  const [values, setValues] = useState<Values>({
    limite_grupo_online: limiteGrupo,
    antelacion_maxima_dias: antelacionMax,
    tope_por_franja_activo: topeActivo,
    tope_por_franja_personas: topePersonas,
  });
  const [saving, setSaving] = useState<ConfigKey | null>(null);
  const [saved, setSaved] = useState<ConfigKey | null>(null);

  async function save(clave: ConfigKey, valor: unknown) {
    setSaving(clave);
    await updateConfiguracion(clave, valor);
    setSaving(null);
    setSaved(clave);
    setTimeout(() => setSaved((s) => (s === clave ? null : s)), 2000);
  }

  const numberFields: Array<{
    key: ConfigKey;
    label: string;
    desc: string;
    min: number;
    max: number;
    disabled?: boolean;
  }> = [
    {
      key: "tope_por_franja_personas",
      label: "Personas máximas por franja",
      desc: "Se aplica solo cuando el tope está activo",
      min: 1,
      max: 200,
      disabled: !values.tope_por_franja_activo,
    },
    {
      key: "limite_grupo_online",
      label: "Límite de grupo online",
      desc: "Grupos más grandes quedan pendientes de aprobación manual",
      min: 1,
      max: 50,
    },
    {
      key: "antelacion_maxima_dias",
      label: "Antelación máxima (días)",
      desc: "Hasta cuántos días de antelación puede reservarse",
      min: 1,
      max: 365,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Toggle tope activo */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white">
        <div>
          <p className="text-sm font-medium text-gray-900">Tope de personas por franja</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Limitar cuántas personas pueden reservar en la misma franja
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const newVal = !values.tope_por_franja_activo;
            setValues((v) => ({ ...v, tope_por_franja_activo: newVal }));
            save("tope_por_franja_activo", newVal);
          }}
          className={[
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            values.tope_por_franja_activo ? "bg-gray-900" : "bg-gray-200",
          ].join(" ")}
          aria-label="Activar tope por franja"
        >
          <span
            className={[
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
              values.tope_por_franja_activo ? "translate-x-5" : "translate-x-0",
            ].join(" ")}
          />
        </button>
      </div>

      {/* Number fields */}
      {numberFields.map(({ key, label, desc, min, max, disabled }) => (
        <div
          key={key}
          className={[
            "p-4 rounded-lg border border-gray-200 bg-white space-y-3 transition-opacity",
            disabled ? "opacity-40" : "",
          ].join(" ")}
        >
          <div>
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={min}
              max={max}
              disabled={disabled}
              value={values[key] as number}
              onChange={(e) =>
                setValues((v) => ({ ...v, [key]: Number(e.target.value) }))
              }
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || saving === key}
              onClick={() => save(key, values[key])}
              className="gap-1.5 text-gray-700 border-gray-300"
            >
              {saved === key ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-green-600">Guardado</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {saving === key ? "Guardando..." : "Guardar"}
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
