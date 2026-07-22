import type { Reserva } from "./supabase/types";
import { countryFromPhone } from "./phone-country";
import { addDaysToDate } from "./utils";

// Estados que NO representan una reserva real (nunca ocurrieron)
const EXCLUDED_ESTADOS = new Set(["cancelada", "rechazada"]);
// Estados que sí fueron reservas aceptadas (para tasa de cancelación/no-show)
const ACCEPTED_ESTADOS = new Set(["confirmada", "llegado", "no_show", "cancelada"]);

const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** Reservas de prueba internas — se excluyen de las estadísticas. */
export function isTestReserva(r: Pick<Reserva, "nombre" | "apellido">): boolean {
  const s = `${r.nombre ?? ""} ${r.apellido ?? ""}`.toLowerCase();
  return s.includes("coran") || s.includes("prueba");
}

export interface Metric {
  reservas: number;
  comensales: number;
}

export interface CompareBlock {
  reservas: number;
  comensales: number;
  deltaReservas: number | null;
  deltaComensales: number | null;
}

export interface RegistroStats {
  hoy: CompareBlock;
  semana: CompareBlock;
  mes: CompareBlock;
  proximos7: Metric;
  captacion: { reservas: number; prevReservas: number; delta: number | null };
  ocupacionHoyPct: number | null;
  grupoMedio: number | null;
  internacionalPct: number | null;
  topPaises: { name: string; flag: string; reservas: number }[];
  franja: { comidaPct: number; cenaPct: number; fuerte: "comida" | "cena" | null };
  diaFuerte: { nombre: string; reservas: number } | null;
  cancelacionPct: number | null;
  excluidasPrueba: number;
}

// % de cambio redondeado. null = no hay base de comparación (antes era 0).
function pct(cur: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
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

function block(
  rows: Reserva[],
  curFrom: string,
  curTo: string,
  prevFrom: string,
  prevTo: string
): CompareBlock {
  const c = sumMetric(rows, curFrom, curTo);
  const p = sumMetric(rows, prevFrom, prevTo);
  return {
    reservas: c.reservas,
    comensales: c.comensales,
    deltaReservas: pct(c.reservas, p.reservas),
    deltaComensales: pct(c.comensales, p.comensales),
  };
}

// created_at (timestamptz UTC) → fecha YYYY-MM-DD en hora de Barcelona
function madridDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

export interface StatsParams {
  fechaRows: Reserva[]; // ventana por día de servicio (incluye canceladas/no-show)
  createdRows: Reserva[]; // ventana por fecha de creación
  today: string; // YYYY-MM-DD hora Barcelona
  topePorFranja: number; // aforo por franja (para ocupación)
}

/**
 * Calcula todas las estadísticas del registro.
 */
export function computeStats({ fechaRows, createdRows, today, topePorFranja }: StatsParams): RegistroStats {
  const excluidasPrueba = fechaRows.filter(isTestReserva).length;

  // Reservas reales (no canceladas/rechazadas ni pruebas) — para volumen
  const rows = fechaRows.filter((r) => !EXCLUDED_ESTADOS.has(r.estado) && !isTestReserva(r));

  const [y, m, d] = today.split("-").map(Number);

  // ── Semana (Lun–Dom) ──────────────────────────────────
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // 0 = lunes
  const monday = addDaysToDate(today, -dow);
  const todayPrev = addDaysToDate(today, -7);
  const mondayPrev = addDaysToDate(monday, -7);

  // ── Mes (día 1 → hoy) vs mes anterior (mismo tramo) ────
  const monthStart = `${y}-${pad(m)}-01`;
  const pmY = m === 1 ? y - 1 : y;
  const pmM = m === 1 ? 12 : m - 1;
  const lastMonthStart = `${pmY}-${pad(pmM)}-01`;
  const lastDayPrevMonth = new Date(pmY, pmM, 0).getDate(); // último día del mes anterior
  const lastMonthSameDay = `${pmY}-${pad(pmM)}-${pad(Math.min(d, lastDayPrevMonth))}`;

  const hoy = block(rows, today, today, todayPrev, todayPrev);
  const semana = block(rows, monday, today, mondayPrev, todayPrev);
  const mes = block(rows, monthStart, today, lastMonthStart, lastMonthSameDay);
  const proximos7 = sumMetric(rows, addDaysToDate(today, 1), addDaysToDate(today, 7));

  // ── Grupo medio (esta semana) ─────────────────────────
  const grupoMedio =
    semana.reservas > 0 ? Math.round((semana.comensales / semana.reservas) * 10) / 10 : null;

  // ── % internacional + top países ──────────────────────
  let intl = 0;
  let semanaRows = 0;
  const paisMap = new Map<string, { name: string; flag: string; reservas: number }>();
  for (const r of rows) {
    const c = countryFromPhone(r.telefono);
    if (r.fecha >= monday && r.fecha <= today) {
      semanaRows += 1;
      if (c && c.code !== "ES") intl += 1;
    }
    if (c) {
      const cur = paisMap.get(c.code) ?? { name: c.name, flag: c.flag, reservas: 0 };
      cur.reservas += 1;
      paisMap.set(c.code, cur);
    }
  }
  const internacionalPct = semanaRows > 0 ? Math.round((intl / semanaRows) * 100) : null;
  const topPaises = Array.from(paisMap.values())
    .sort((a, b) => b.reservas - a.reservas)
    .slice(0, 3);

  // ── Franja fuerte (comida < 17:00 ≤ cena) y día fuerte ─
  let comida = 0;
  let cena = 0;
  const porDia = new Array(7).fill(0);
  for (const r of rows) {
    const hour = parseInt((r.hora ?? "00").slice(0, 2), 10);
    if (hour < 17) comida += 1;
    else cena += 1;
    const [ry, rm, rd] = r.fecha.split("-").map(Number);
    const wd = (new Date(ry, rm - 1, rd).getDay() + 6) % 7;
    porDia[wd] += 1;
  }
  const totalFranja = comida + cena;
  const franja = {
    comidaPct: totalFranja > 0 ? Math.round((comida / totalFranja) * 100) : 0,
    cenaPct: totalFranja > 0 ? Math.round((cena / totalFranja) * 100) : 0,
    fuerte: (totalFranja === 0 ? null : comida > cena ? "comida" : cena > comida ? "cena" : null) as
      | "comida"
      | "cena"
      | null,
  };
  const maxDia = Math.max(...porDia);
  const diaFuerte = maxDia > 0 ? { nombre: WEEKDAYS[porDia.indexOf(maxDia)], reservas: maxDia } : null;

  // ── Ocupación de hoy (aforo estimado = tope × 6 franjas/día) ─
  const aforoDia = topePorFranja * 6;
  const comensalesHoy = sumMetric(rows, today, today).comensales;
  const ocupacionHoyPct = aforoDia > 0 ? Math.round((comensalesHoy / aforoDia) * 100) : null;

  // ── Cancelación / no-show (últimos 30 días por día de servicio) ─
  const cancelFrom = addDaysToDate(today, -29);
  let aceptadas = 0;
  let perdidas = 0; // canceladas + no_show
  for (const r of fechaRows) {
    if (isTestReserva(r)) continue;
    if (r.fecha < cancelFrom || r.fecha > today) continue;
    if (!ACCEPTED_ESTADOS.has(r.estado)) continue;
    aceptadas += 1;
    if (r.estado === "cancelada" || r.estado === "no_show") perdidas += 1;
  }
  const cancelacionPct = aceptadas > 0 ? Math.round((perdidas / aceptadas) * 100) : null;

  // ── Ritmo de captación (por fecha de creación) ────────
  let capCur = 0;
  let capPrev = 0;
  for (const r of createdRows) {
    if (isTestReserva(r)) continue;
    if (r.estado === "rechazada") continue;
    const cd = madridDate(r.created_at);
    if (cd >= monday && cd <= today) capCur += 1;
    else if (cd >= mondayPrev && cd <= todayPrev) capPrev += 1;
  }
  const captacion = { reservas: capCur, prevReservas: capPrev, delta: pct(capCur, capPrev) };

  return {
    hoy,
    semana,
    mes,
    proximos7,
    captacion,
    ocupacionHoyPct,
    grupoMedio,
    internacionalPct,
    topPaises,
    franja,
    diaFuerte,
    cancelacionPct,
    excluidasPrueba,
  };
}
