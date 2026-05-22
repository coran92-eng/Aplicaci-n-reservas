"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="text-xl font-semibold mb-2">Algo ha ido mal</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Si el problema persiste, llámanos al{" "}
          <a href="tel:+34931234567" className="underline">+34 931 234 567</a>
        </p>
        <div className="flex gap-3">
          <Button onClick={reset} variant="outline" className="flex-1">
            Reintentar
          </Button>
          <Link href="/es" className="flex-1">
            <Button className="w-full">Ir al inicio</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
