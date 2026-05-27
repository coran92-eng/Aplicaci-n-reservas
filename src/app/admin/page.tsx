import { createServiceClient } from "@/lib/supabase/server";
import { ReservationList } from "@/components/admin/ReservationList";
import { DayNavigation } from "@/components/admin/DayNavigation";
import { todayBarcelona } from "@/lib/utils";
import type { Reserva } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const today = todayBarcelona();
  let reservas: Reserva[] = [];

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("reservas")
      .select("*")
      .eq("fecha", today)
      .order("hora", { ascending: true });
    reservas = (data ?? []) as Reserva[];
  } catch {
    // DB unavailable — render empty state so the page doesn't crash
  }

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
      <ReservationList reservas={reservas} currentDate={today} />
    </>
  );
}
