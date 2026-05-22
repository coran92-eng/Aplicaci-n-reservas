import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
        <p className="text-6xl font-bold mb-4">404</p>
        <h1 className="text-xl font-semibold mb-2">Página no encontrada</h1>
        <p className="text-muted-foreground text-sm mb-6">
          El enlace puede haber caducado o no ser correcto.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          ¿Necesitas ayuda? Llámanos al{" "}
          <a href="tel:+34931234567" className="underline">+34 931 234 567</a>
        </p>
        <Link href="/es">
          <Button className="w-full">Volver al inicio</Button>
        </Link>
      </div>
    </main>
  );
}
