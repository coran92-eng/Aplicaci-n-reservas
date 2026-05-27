"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ADMIN ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Error en el panel de administración
          </h1>
          <p className="text-sm text-gray-500">
            Se ha producido un error al cargar esta página.
          </p>
        </div>

        {error.message && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium text-red-700 mb-1">Detalle del error:</p>
            <p className="text-xs font-mono text-red-600 break-all">{error.message}</p>
          </div>
        )}

        {error.digest && (
          <p className="text-xs text-gray-400 font-mono">
            Digest: {error.digest}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Reintentar
          </button>
          <Link
            href="/admin"
            className="flex-1 h-10 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            Ir al panel
          </Link>
        </div>

        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">
            Posibles causas
          </summary>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Variable <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> no configurada en Vercel</li>
            <li>Variable <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> no configurada</li>
            <li>Variable <code className="font-mono">ADMIN_MAGIC_LINK_SECRET</code> no configurada</li>
            <li>Error de conexión con la base de datos</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
