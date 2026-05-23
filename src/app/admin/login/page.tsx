"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAdmin } from "@/actions/admin";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-black text-white rounded-md py-2 text-sm font-medium disabled:opacity-50"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export default function AdminLoginPage() {
  const [state, action] = useFormState(loginAdmin, undefined);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-black text-white text-center py-6 rounded-t-lg">
          <h1 className="text-lg font-semibold">Corte de Manga</h1>
          <p className="text-xs text-gray-400 mt-1">Panel de administración</p>
        </div>
        <form
          action={action}
          className="bg-white rounded-b-lg shadow-sm border border-t-0 px-6 py-8 space-y-4"
        >
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="••••••••"
            />
          </div>
          {state?.error === "incorrect" && (
            <p className="text-sm text-red-600">Contraseña incorrecta.</p>
          )}
          {state?.error === "rate_limit" && (
            <p className="text-sm text-red-600">Demasiados intentos. Espera unos minutos.</p>
          )}
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
