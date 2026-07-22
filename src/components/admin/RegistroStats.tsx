import type { RegistroStats } from "@/lib/registro-stats";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-xs font-medium text-gray-400">nuevo</span>;
  }
  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-400">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  const up = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        up ? "text-green-600" : "text-red-600"
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

function CompareCard({
  title,
  subtitle,
  reservas,
  comensales,
  deltaReservas,
  deltaComensales,
}: {
  title: string;
  subtitle: string;
  reservas: number;
  comensales: number;
  deltaReservas: number | null;
  deltaComensales: number | null;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <Delta pct={deltaReservas} />
      </div>
      <p className="text-[11px] text-gray-400 mb-3">{subtitle}</p>
      <div className="flex items-end gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-900 leading-none">{reservas}</p>
          <p className="text-[11px] text-gray-500 mt-1">reservas</p>
        </div>
        <div className="pb-0.5">
          <div className="flex items-center gap-1.5">
            <p className="text-lg font-semibold text-gray-700 leading-none">{comensales}</p>
            <Delta pct={deltaComensales} />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">comensales</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  unit,
  hint,
}: {
  title: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 leading-none mt-2">
        {value}
        {unit && <span className="text-sm font-medium text-gray-400 ml-1">{unit}</span>}
      </p>
      {hint && <p className="text-[11px] text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

export function RegistroStats({ stats }: { stats: RegistroStats }) {
  const topPais = stats.topPaises[0];

  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Estadísticas <span className="normal-case font-normal text-gray-400">· por día de servicio</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CompareCard
          title="Hoy"
          subtitle="vs mismo día de la semana pasada"
          reservas={stats.hoy.reservas}
          comensales={stats.hoy.comensales}
          deltaReservas={stats.hoyDeltaReservas}
          deltaComensales={stats.hoyDeltaComensales}
        />
        <CompareCard
          title="Esta semana"
          subtitle="hasta hoy vs la semana anterior"
          reservas={stats.semana.reservas}
          comensales={stats.semana.comensales}
          deltaReservas={stats.semanaDeltaReservas}
          deltaComensales={stats.semanaDeltaComensales}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <StatCard
          title="Próximos 7 días"
          value={String(stats.proximos7.reservas)}
          unit="res."
          hint={`${stats.proximos7.comensales} comensales en cartera`}
        />
        <StatCard
          title="Grupo medio"
          value={stats.grupoMedio !== null ? String(stats.grupoMedio) : "—"}
          unit="pers."
          hint="esta semana"
        />
        <StatCard
          title="Internacional"
          value={stats.internacionalPct !== null ? `${stats.internacionalPct}%` : "—"}
          hint="reservas de fuera de España (semana)"
        />
        <StatCard
          title="País top"
          value={topPais ? topPais.flag : "—"}
          hint={topPais ? `${topPais.name} · ${topPais.reservas} res.` : "sin datos"}
        />
      </div>

      {stats.excluidasPrueba > 0 && (
        <p className="text-[11px] text-gray-400 mt-2">
          Se han excluido {stats.excluidasPrueba} reserva
          {stats.excluidasPrueba !== 1 ? "s" : ""} de prueba (Coran/prueba).
        </p>
      )}
    </section>
  );
}
