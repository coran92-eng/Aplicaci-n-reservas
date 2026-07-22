import type { Reserva } from "./supabase/types";
import { countryFromPhone } from "./phone-country";
import { addDaysToDate } from "./utils";

// Estados que NO representan una reserva real (nunca ocurrieron)
const EXCLUDED_ESTADOS = new Set(["cancelada", "rechazada"]);

/** Reservas de prueba internas — se excluyen de las estadísticas. */
export function isTestReserva(r: Pick<Reserva, "nombre" | "apellido">): boolean {
  const s = `${r.nombre ?? ""} ${r.apellido ?? ""}`.toLowerCase();
  return s.includes("coran") || s.includes("prueba");
}

export interface Metric {
  reservas: number;
  comensales: number;
}

export interface RegistroStats {
  hoy: Metric;
  hoyPrev: Metric;
  hoyDeltaReservas: number | null;
  hoyDeltaComensales: number | null;
  semana: Metric;
  semanaPrev: Metric;
  semanaDeltaReservas: number | null;
  semanaDeltaComensales: number | null;
  proximos7: Metric;
  grupoMedio: number | null;
  internacionalPct: number | null;
  topPaises: { name: string; flag: string; reservas: number }[];
  excluidasPrueba: number;
}

// % de cambio redondeado. null = no hay base de comparación (antes era 0).
function pct(cur: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

function sumMetric(rows: Reserva[], from: string, to: string): Metric {
  let reservas = 0;
  let comensales = 0;
  for (const r of rows) {
    if (r.fecha >= from && r.fecha <= to) {
      reservas += 1;
      comensales += r.personas;
    }
  }
  return { reservas, comensales };
}

/**
 * Calcula las estadísticas del registro a partir de las reservas de una ventana
 * temporal (por día de servicio) y la fecha de hoy (YYYY-MM-DD, hora Barcelona).
 */
export function computeStats(rowsRaw: Reserva[], today: string): RegistroStats {
  const excluidasPrueba = rowsRaw.filter(isTestReserva).length;

  // Solo reservas reales (no canceladas/rechazadas ni pruebas)
  const rows = rowsRaw.filter(
    (r) => !EXCLUDED_ESTADOS.has(r.estado) && !isTestReserva(r)
  );

  // Lunes de esta semana (semana Lun–Dom)
  const [y, m, d] = today.split("-").map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // 0 = lunes
  const monday = addDaysToDate(today, -dow);

  const todayPrev = addDaysToDate(today, -7);
  const mondayPrev = addDaysToDate(monday, -7);

  const hoy = sumMetric(rows, today, today);
  const hoyPrev = sumMetric(rows, todayPrev, todayPrev);
  const semana = sumMetric(rows, monday, today);
  const semanaPrev = sumMetric(rows, mondayPrev, todayPrev);
  const proximos7 = sumMetric(rows, addDaysToDate(today, 1), addDaysToDate(today, 7));

  // Tamaño medio de grupo (esta semana)
  const grupoMedio =
    semana.reservas > 0
      ? Math.round((semana.comensales / semana.reservas) * 10) / 10
      : null;

  // % internacional (esta semana): reservas con prefijo de país ≠ ES
  let intl = 0;
  let semanaRows = 0;
  for (const r of rows) {
    if (r.fecha >= monday && r.fecha <= today) {
      semanaRows += 1;
      const c = countryFromPhone(r.telefono);
      if (c && c.code !== "ES") intl += 1;
    }
  }
  const internacionalPct = semanaRows > 0 ? Math.round((intl / semanaRows) * 100) : null;

  // Top países en toda la ventana
  const paisMap = new Map<string, { name: string; flag: string; reservas: number }>();
  for (const r of rows) {
    const c = countryFromPhone(r.telefono);
    if (!c) continue;
    const cur = paisMap.get(c.code) ?? { name: c.name, flag: c.flag, reservas: 0 };
    cur.reservas += 1;
    paisMap.set(c.code, cur);
  }
  const topPaises = Array.from(paisMap.values())
    .sort((a, b) => b.reservas - a.reservas)
    .slice(0, 3);

  return {
    hoy,
    hoyPrev,
    hoyDeltaReservas: pct(hoy.reservas, hoyPrev.reservas),
    hoyDeltaComensales: pct(hoy.comensales, hoyPrev.comensales),
    semana,
    semanaPrev,
    semanaDeltaReservas: pct(semana.reservas, semanaPrev.reservas),
    semanaDeltaComensales: pct(semana.comensales, semanaPrev.comensales),
    proximos7,
    grupoMedio,
    internacionalPct,
    topPaises,
    excluidasPrueba,
  };
}
