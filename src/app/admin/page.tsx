import { createServiceClient } from "@/lib/supabase/server";
import { ReservationList } from "@/components/admin/ReservationList";
import { DayNavigation } from "@/components/admin/DayNavigation";
import { todayBarcelona } from "@/lib/utils";
import type { Reserva } from "@/lib/supabase/types";

export const revalidate = 60;

export default async function AdminPage() {
  const today = todayBarcelona();
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("reservas")
    .select("*")
    .eq("fecha", today)
    .order("hora", { ascending: true });

  const reservas = (data ?? []) as Reserva[];
  const active = reservas.filter(
    (r) => r.estado !== "cancelada" && r.estado !== "rechazada"
  );
  const totalPersonas = active.reduce((s, r) => s + r.personas, 0);

  return (
    <>
      <DayNavigation
        currentDate={today}
        totalReservas={active.length}
        totalPersonas={totalPersonas}
      />
      <ReservationList reservas={reservas} />
    </>
  );
}
