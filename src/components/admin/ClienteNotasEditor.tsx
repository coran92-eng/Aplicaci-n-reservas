"use client";

import { useState } from "react";
import { updateClienteNotas } from "@/actions/crm";

interface Props {
  clienteId: string;
  initialNotas: string;
}

export function ClienteNotasEditor({ clienteId, initialNotas }: Props) {
  const [notas, setNotas] = useState(initialNotas);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await updateClienteNotas(clienteId, notas);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-2">
      <textarea
        value={notas}
        onChange={(e) => { setNotas(e.target.value); setSaved(false); }}
        rows={4}
        placeholder="Sin notas"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
      </button>
    </div>
  );
}
