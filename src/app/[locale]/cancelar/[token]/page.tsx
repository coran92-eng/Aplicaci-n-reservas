import type { Metadata } from "next";
import { Shell } from "@/components/site/Shell";
import { CancelarCliente } from "@/components/forms/CancelarCliente";

// Página personal de cada reserva: fuera de los buscadores
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function CancelarPage({
  params: { token },
}: {
  params: { token: string };
}) {
  return (
    <Shell>
      <CancelarCliente token={token} />
    </Shell>
  );
}
