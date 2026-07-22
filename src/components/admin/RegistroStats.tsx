import type { RegistroStats, CompareBlock } from "@/lib/registro-stats";
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

function CompareCard({ title, subtitle, block }: { title: string; subtitle: string; block: CompareBlock }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <Delta pct={block.deltaReservas} />
      </div>
      <p className="text-[11px] text-gray-400 mb-3">{subtitle}</p>
      <div className="flex items-end gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-900 leading-none">{block.reservas}</p>
          <p className="text-[11px] text-gray-500 mt-1">reservas</p>
        </div>
        <div className="pb-0.5">
          <div className="flex items-center gap-1.5">
            <p className="text-lg font-semibold text-gray-700 leading-none">{block.comensales}</p>
            <Delta pct={block.deltaComensales} />
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
  delta,
}: {
  title: string;
  value: string;
  unit?: string;
  hint?: string;
  delta?: number | null;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {delta !== undefined && <Delta pct={delta} />}
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none mt-2">
        {value}
        {unit && <span className="text-sm font-medium text-gray-400 ml-1">{unit}</span>}
      </p>
      {hint && <p className="text-[11px] text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-2 first:mt-0">
      {children}
    </h2>
  );
}

export function RegistroStats({ stats }: { stats: RegistroStats }) {
  const topPais = stats.topPaises[0];
  const cap = stats.franja.fuerte
    ? stats.franja.fuerte === "cena"
      ? `Cena ${stats.franja.cenaPct}%`
      : `Comida ${stats.franja.comidaPct}%`
    : "—";

  return (
    <section className="mb-6">
      <SectionLabel>Comparativas · por día de servicio</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CompareCard title="Hoy" subtitle="vs mismo día semana pasada" block={stats.hoy} />
        <CompareCard title="Esta semana" subtitle="hasta hoy vs semana anterior" block={stats.semana} />
        <CompareCard title="Este mes" subtitle="hasta hoy vs mes anterior" block={stats.mes} />
      </div>

      <SectionLabel>Cartera y ritmo</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="Próximos 7 días"
          value={String(stats.proximos7.reservas)}
          unit="res."
          hint={`${stats.proximos7.comensales} comensales en cartera`}
        />
        <StatCard
          title="Captación"
          value={String(stats.captacion.reservas)}
          unit="res."
          delta={stats.captacion.delta}
          hint="creadas esta semana vs anterior"
        />
        <StatCard
          title="Ocupación hoy"
          value={stats.ocupacionHoyPct !== null ? `${stats.ocupacionHoyPct}%` : "—"}
          hint="aprox. sobre aforo estimado del día"
        />
      </div>

      <SectionLabel>Patrones y calidad</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="Grupo medio"
          value={stats.grupoMedio !== null ? String(stats.grupoMedio) : "—"}
          unit="pers."
          hint="esta semana"
        />
        <StatCard
          title="Cancel./No-show"
          value={stats.cancelacionPct !== null ? `${stats.cancelacionPct}%` : "—"}
          hint="últimos 30 días"
        />
        <StatCard
          title="Franja fuerte"
          value={cap}
          hint="reparto comida / cena"
        />
        <StatCard
          title="Día fuerte"
          value={stats.diaFuerte ? stats.diaFuerte.nombre : "—"}
          hint={stats.diaFuerte ? `${stats.diaFuerte.reservas} reservas` : "sin datos"}
        />
        <StatCard
          title="Internacional"
          value={stats.internacionalPct !== null ? `${stats.internacionalPct}%` : "—"}
          hint="de fuera de España (semana)"
        />
        <StatCard
          title="País top"
          value={topPais ? `${topPais.flag} ${topPais.name}` : "—"}
          hint={topPais ? `${topPais.reservas} reservas` : "sin datos"}
        />
      </div>

      {stats.excluidasPrueba > 0 && (
        <p className="text-[11px] text-gray-400 mt-3">
          Se han excluido {stats.excluidasPrueba} reserva
          {stats.excluidasPrueba !== 1 ? "s" : ""} de prueba (Coran/prueba) y las canceladas/rechazadas del cómputo de volumen.
        </p>
      )}
    </section>
  );
}
