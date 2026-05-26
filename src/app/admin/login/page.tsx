"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAdmin, sendAdminMagicLink } from "@/actions/admin";
import { useState } from "react";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-black text-white rounded-md py-2 text-sm font-medium disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [passwordState, passwordAction] = useFormState(loginAdmin, undefined);
  const [magicState, magicAction] = useFormState(sendAdminMagicLink, undefined);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-black text-white text-center py-6 rounded-t-lg">
          <h1 className="text-lg font-semibold">Corte de Manga</h1>
          <p className="text-xs text-gray-400 mt-1">Panel de administración</p>
        </div>

        <div className="bg-white rounded-b-lg shadow-sm border border-t-0 px-6 py-8">
          <div className="flex rounded-md overflow-hidden border border-gray-200 mb-6">
            <button
              type="button"
              onClick={() => setMode("password")}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                mode === "password" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Contraseña
            </button>
            <button
              type="button"
              onClick={() => setMode("magic")}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                mode === "magic" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Enlace mágico
            </button>
          </div>

          {searchParams.error === "magic_expired" && (
            <p className="text-sm text-red-600 mb-4">El enlace ha caducado. Solicita uno nuevo.</p>
          )}

          {mode === "password" && (
            <form action={passwordAction} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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
              {passwordState?.error === "incorrect" && (
                <p className="text-sm text-red-600">Contraseña incorrecta.</p>
              )}
              {passwordState?.error === "rate_limit" && (
                <p className="text-sm text-red-600">Demasiados intentos. Espera unos minutos.</p>
              )}
              <SubmitButton label="Entrar" pendingLabel="Entrando…" />
            </form>
          )}

          {mode === "magic" && (
            <form action={magicAction} className="space-y-4">
              {magicState?.sent ? (
                <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
                  Si el email es correcto, recibirás un enlace en breve. Revisa también el spam.
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email de administrador
                    </label>
                    <input
                      id="magic-email"
                      name="email"
                      type="email"
                      required
                      autoFocus
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="admin@ejemplo.es"
                    />
                  </div>
                  {magicState?.error === "rate_limit" && (
                    <p className="text-sm text-red-600">Demasiados intentos. Espera unos minutos.</p>
                  )}
                  {magicState?.error === "generic" && (
                    <p className="text-sm text-red-600">Error al enviar. Inténtalo de nuevo.</p>
                  )}
                  <SubmitButton label="Enviar enlace" pendingLabel="Enviando…" />
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
