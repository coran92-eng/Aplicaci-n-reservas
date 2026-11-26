import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CalculadoraGrupos } from "@/components/admin/CalculadoraGrupos";

export const metadata: Metadata = { title: "Grupos · Admin · Corte de Manga" };

// Calculadora de menús de grupo: platos de cada entrante por mesa, segundos, postres y total.
export default function GruposPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver al panel
      </Link>
      <CalculadoraGrupos />
    </div>
  );
}
