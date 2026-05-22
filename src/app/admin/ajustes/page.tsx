import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AjustesPage() {
  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-bold mb-1">Ajustes</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Panel de configuración del sistema de reservas.
      </p>

      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <h2 className="font-medium mb-1">Fase 3 (próximamente)</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Pausar franjas horarias</li>
            <li>• Cerrar días completos</li>
            <li>• Tope de personas por franja</li>
            <li>• Exportar CSV de reservas</li>
          </ul>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-medium mb-1">Información del sistema</h2>
          <p className="text-sm text-muted-foreground">
            App de reservas Corte de Manga — Fase 1 activa
          </p>
        </div>
      </div>
    </div>
  );
}
