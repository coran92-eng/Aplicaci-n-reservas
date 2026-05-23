import { createServiceClient } from "@/lib/supabase/server";
import { ReservationList } from "@/components/admin/ReservationList";
import { DayNavigation } from "@/components/admin/DayNavigation";
import type { Reserva } from "@/lib/supabase/types";

export const revalidate = 60;

export default async function DiaPage({
  params: { fecha },
}: {
  params: { fecha: string };
}) {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("reservas")
    .select("*")
    .eq("fecha", fecha)
    .order("hora", { ascending: true });

  const reservas = (data ?? []) as Reserva[];
  const active = reservas.filter(
    (r) => r.estado !== "cancelada" && r.estado !== "rechazada"
  );
  const totalPersonas = active.reduce((s, r) => s + r.personas, 0);

  return (
    <>
      <DayNavigation
        currentDate={fecha}
        totalReservas={active.length}
        totalPersonas={totalPersonas}
      />
      <ReservationList reservas={reservas} currentDate={fecha} />
    </>
  );
}
