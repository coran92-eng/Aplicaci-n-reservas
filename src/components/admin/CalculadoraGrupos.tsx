"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Minus, Plus, RotateCcw, TriangleAlert } from "lucide-react";
import {
  MENUS_GRUPO,
  PAN_EXTRA,
  euros,
  platosMesa,
  reglaTexto,
  repartir,
  repartirMesas,
  unidadesMesa,
  type Entrante,
  type MenuGrupo,
  type Opcion,
} from "@/lib/menus-grupo";
import { cn } from "@/lib/utils";

// ── Piezas pequeñas ─────────────────────────────────────────────

function Stepper({
  value,
  onChange,
  min = 0,
  max = 200,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Number.isFinite(v) ? Math.round(v) : min)));
  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={value <= min}
        aria-label={`Quitar uno: ${label}`}
        className="flex h-11 w-11 items-center justify-center text-gray-600 disabled:text-gray-300"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => set(parseInt(e.target.value || "0", 10))}
        className="h-11 w-14 border-x border-gray-200 text-center text-base font-semibold tabular-nums outline-none focus:bg-gray-50"
      />
      <button
        type="button"
        onClick={() => set(value + 1)}
        disabled={value >= max}
        aria-label={`Añadir uno: ${label}`}
        className="flex h-11 w-11 items-center justify-center text-gray-600 disabled:text-gray-300"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function Seccion({ titulo, children, extra }: { titulo: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

const plural = (n: number, [uno, varios]: [string, string]) => (n === 1 ? uno : varios);

// ── Cálculo de un entrante en una mesa ──────────────────────────

function celda(entrante: Entrante, personas: number) {
  const platos = platosMesa(entrante.regla, personas);
  const unidades = unidadesMesa(entrante.regla, personas);
  return { platos, unidades };
}

function textoCelda(entrante: Entrante, personas: number): { principal: string; detalle?: string } {
  const { platos, unidades } = celda(entrante, personas);
  if (entrante.regla.tipo === "porPersona") {
    const reparto = repartir(unidades, platos);
    return {
      principal: `${unidades} ${plural(unidades, entrante.regla.unidad)}`,
      detalle: platos === 1 ? "en 1 plato" : `en ${platos} platos (${reparto.join(" + ")})`,
    };
  }
  return { principal: `${platos} ${plural(platos, entrante.regla.unidad)}` };
}

function totalEntrante(entrante: Entrante, mesas: number[]): { principal: string; detalle?: string } {
  const platos = mesas.reduce((s, p) => s + platosMesa(entrante.regla, p), 0);
  const unidades = mesas.reduce((s, p) => s + unidadesMesa(entrante.regla, p), 0);
  if (entrante.regla.tipo === "porPersona") {
    return { principal: `${unidades} ${plural(unidades, entrante.regla.unidad)}`, detalle: `${platos} ${plural(platos, ["plato", "platos"])}` };
  }
  return { principal: `${platos} ${plural(platos, entrante.regla.unidad)}` };
}

// ── Calculadora ─────────────────────────────────────────────────

export function CalculadoraGrupos() {
  const [menuId, setMenuId] = useState<MenuGrupo["id"]>("corte");
  const [bebida, setBebida] = useState(false);
  const [mesas, setMesas] = useState<number[]>([8]);
  const [segundos, setSegundos] = useState<Record<string, number>>({});
  const [postres, setPostres] = useState<Record<string, number>>({});
  const [jamonExtra, setJamonExtra] = useState(0);
  const [panExtra, setPanExtra] = useState(0);
  const [senal, setSenal] = useState("");
  const [copiado, setCopiado] = useState(false);

  const menu = MENUS_GRUPO.find((m) => m.id === menuId) ?? MENUS_GRUPO[0];
  const personas = mesas.reduce((s, p) => s + p, 0);
  const precio = bebida ? menu.precioBebida : menu.precio;

  function elegirMenu(id: MenuGrupo["id"]) {
    setMenuId(id);
    // los segundos y postres cambian de un menú a otro
    setSegundos({});
    setPostres({});
    setJamonExtra(0);
  }

  function cambiarNumMesas(n: number) {
    setMesas(repartirMesas(personas, Math.max(1, n)));
  }

  function cambiarMesa(i: number, v: number) {
    setMesas((prev) => prev.map((p, j) => (j === i ? v : p)));
  }

  function reiniciar() {
    setMenuId("corte");
    setBebida(false);
    setMesas([8]);
    setSegundos({});
    setPostres({});
    setJamonExtra(0);
    setPanExtra(0);
    setSenal("");
  }

  const cuentas = useMemo(() => {
    const sup = menu.segundos
      .filter((o) => o.suplemento && (segundos[o.id] ?? 0) > 0)
      .map((o) => ({ opcion: o, n: segundos[o.id] ?? 0, importe: (segundos[o.id] ?? 0) * (o.suplemento ?? 0) }));
    const base = personas * precio;
    const suplementos = sup.reduce((s, x) => s + x.importe, 0);
    const jamon = menu.extraJamon ? jamonExtra * menu.extraJamon : 0;
    const pan = panExtra * PAN_EXTRA;
    const senalNum = Math.max(0, parseFloat(senal.replace(",", ".")) || 0);
    const total = base + suplementos + jamon + pan;
    return { sup, base, suplementos, jamon, pan, senalNum, total, aCobrar: Math.max(0, total - senalNum) };
  }, [menu, segundos, personas, precio, jamonExtra, panExtra, senal]);

  const elegidosSeg = menu.segundos.reduce((s, o) => s + (segundos[o.id] ?? 0), 0);
  const elegidosPos = menu.postres.reduce((s, o) => s + (postres[o.id] ?? 0), 0);
  const bajoMinimo = personas < menu.minimo;

  function resumen(): string {
    const l: string[] = [];
    const reparto = mesas.length > 1 ? ` (mesas ${mesas.join(" + ")})` : "";
    l.push(`GRUPO · ${menu.nombre} ${bebida ? "con" : "sin"} bebida · ${personas} personas${reparto}`);
    l.push("");
    l.push("ENTRANTES AL CENTRO");
    mesas.forEach((p, i) => {
      const items = menu.entrantes.map((e) => {
        const t = textoCelda(e, p);
        return `${e.nombre}: ${t.principal}${t.detalle ? ` ${t.detalle}` : ""}`;
      });
      l.push(mesas.length > 1 ? `Mesa ${i + 1} (${p}):` : `Mesa (${p}):`);
      items.forEach((x) => l.push(`- ${x}`));
    });
    if (mesas.length > 1) {
      l.push("Total:");
      menu.entrantes.forEach((e) => {
        const t = totalEntrante(e, mesas);
        l.push(`- ${e.nombre}: ${t.principal}${t.detalle ? ` (${t.detalle})` : ""}`);
      });
    }
    const lista = (ops: Opcion[], cuenta: Record<string, number>) =>
      ops.map((o) => `${o.nombre} ${cuenta[o.id] ?? 0}`).join(" · ");
    l.push("");
    l.push(`SEGUNDOS (${elegidosSeg} de ${personas}): ${lista(menu.segundos, segundos)}`);
    l.push(`POSTRES (${elegidosPos} de ${personas}): ${lista(menu.postres, postres)}`);
    l.push("");
    l.push(`${personas} × ${euros(precio)} = ${euros(cuentas.base)}`);
    cuentas.sup.forEach((s) => l.push(`Suplemento ${s.opcion.nombre}: ${s.n} × ${euros(s.opcion.suplemento ?? 0)} = ${euros(s.importe)}`));
    if (cuentas.jamon) l.push(`Jamón extra: ${jamonExtra} × ${euros(menu.extraJamon ?? 0)} = ${euros(cuentas.jamon)}`);
    if (cuentas.pan) l.push(`Pan repuesto: ${panExtra} × ${euros(PAN_EXTRA)} = ${euros(cuentas.pan)}`);
    if (cuentas.senalNum) l.push(`Señal ya pagada: −${euros(cuentas.senalNum)}`);
    l.push(`TOTAL A COBRAR: ${euros(cuentas.aCobrar)}`);
    return l.join("\n");
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(resumen());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="space-y-8" data-calc>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calculadora de grupos</h1>
          <p className="mt-1 text-sm text-gray-500">Elige el menú y las personas: salen los platos de cada mesa y el total.</p>
        </div>
        <button
          type="button"
          onClick={reiniciar}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm text-gray-500 hover:text-gray-900"
        >
          <RotateCcw className="h-4 w-4" />
          Nuevo
        </button>
      </div>

      {/* 1 · Menú */}
      <Seccion titulo="Menú">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Menú">
          {MENUS_GRUPO.map((m) => {
            const activo = m.id === menu.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => elegirMenu(m.id)}
                className={cn(
                  "rounded-xl border px-2 py-3 text-left transition-colors",
                  activo ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-900"
                )}
              >
                <span className="block text-sm font-semibold leading-tight">{m.nombre}</span>
                <span className={cn("mt-1 block text-xs tabular-nums", activo ? "text-gray-300" : "text-gray-500")}>
                  {m.precio} € · {m.precioBebida} € con bebida
                </span>
                <span className={cn("mt-0.5 block text-xs", activo ? "text-gray-300" : "text-gray-500")}>desde {m.minimo}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Bebida">
          {[false, true].map((b) => (
            <button
              key={String(b)}
              type="button"
              role="radio"
              aria-checked={bebida === b}
              onClick={() => setBebida(b)}
              className={cn(
                "h-11 rounded-xl border text-sm font-medium transition-colors",
                bebida === b ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700"
              )}
            >
              {b ? `Con bebida · ${menu.precioBebida} €` : `Sin bebida · ${menu.precio} €`}
            </button>
          ))}
        </div>
      </Seccion>

      {/* 2 · Personas y mesas */}
      <Seccion titulo="Personas y mesas">
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-700">Mesas</span>
            <Stepper value={mesas.length} onChange={cambiarNumMesas} min={1} max={12} label="mesas" />
          </div>
          {mesas.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-700">{mesas.length > 1 ? `Mesa ${i + 1} · personas` : "Personas"}</span>
              <Stepper value={p} onChange={(v) => cambiarMesa(i, v)} min={1} max={80} label={mesas.length > 1 ? `personas de la mesa ${i + 1}` : "personas"} />
            </div>
          ))}
          {mesas.length > 1 && (
            <p className="text-right text-sm text-gray-500">
              Total: <strong className="text-gray-900 tabular-nums">{personas} personas</strong>
            </p>
          )}
        </div>
        {bajoMinimo && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            El {menu.nombre} es desde {menu.minimo} personas.
          </p>
        )}
      </Seccion>

      {/* 3 · Entrantes: un bloque por plato, con el total para cocina y el reparto por mesa para sala */}
      <Seccion
        titulo="Entrantes al centro"
        extra={<span className="text-xs text-gray-500">{mesas.length > 1 ? "total y reparto por mesa" : "se sirven a la vez"}</span>}
      >
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
          {menu.entrantes.map((e) => {
            const total = mesas.length > 1 ? totalEntrante(e, mesas) : textoCelda(e, mesas[0]);
            return (
              <li key={e.id} className="px-4 py-3" data-entrante={e.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{e.nombre}</p>
                    <p className="text-xs text-gray-500">{reglaTexto(e.regla)}</p>
                    {e.nota && <p className="text-xs text-gray-500">{e.nota}</p>}
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-lg font-bold leading-tight text-gray-900">{total.principal}</p>
                    {total.detalle && <p className="text-xs text-gray-500">{total.detalle}</p>}
                  </div>
                </div>
                {mesas.length > 1 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`${e.nombre} por mesa`}>
                    {mesas.map((p, i) => {
                      const t = textoCelda(e, p);
                      return (
                        <li key={i} data-mesa={i + 1} className="rounded-lg bg-gray-100 px-2 py-1 text-xs tabular-nums text-gray-700">
                          <span className="font-semibold text-gray-900">Mesa {i + 1}</span> ({p}): {t.principal}
                          {t.detalle ? ` ${t.detalle}` : ""}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </Seccion>

      {/* 4 · Segundos y postres */}
      {(
        [
          ["Segundos", menu.segundos, segundos, setSegundos, elegidosSeg],
          ["Postres", menu.postres, postres, setPostres, elegidosPos],
        ] as const
      ).map(([titulo, opciones, cuenta, setCuenta, elegidos]) => (
        <Seccion
          key={titulo}
          titulo={titulo}
          extra={
            <span className={cn("text-xs tabular-nums", elegidos === personas ? "text-emerald-700" : "text-amber-700")}>
              {elegidos} de {personas} elegidos
            </span>
          }
        >
          <div className="divide-y divide-gray-50 rounded-2xl border border-gray-100 bg-white">
            {opciones.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="text-sm text-gray-900">
                  {o.nombre}
                  {o.suplemento ? <span className="ml-1.5 text-xs font-medium text-gray-500">+{euros(o.suplemento)}</span> : null}
                </span>
                <Stepper
                  value={cuenta[o.id] ?? 0}
                  onChange={(v) => setCuenta((prev) => ({ ...prev, [o.id]: v }))}
                  label={o.nombre}
                />
              </div>
            ))}
          </div>
        </Seccion>
      ))}

      {/* 5 · Extras y señal */}
      <Seccion titulo="Extras y señal">
        <div className="divide-y divide-gray-50 rounded-2xl border border-gray-100 bg-white">
          {menu.extraJamon ? (
            <div className="flex items-center justify-between gap-3 px-4 py-2">
              <span className="text-sm text-gray-900">
                Tablas de jamón extra <span className="text-xs text-gray-500">({euros(menu.extraJamon)} cada una)</span>
              </span>
              <Stepper value={jamonExtra} onChange={setJamonExtra} label="tablas de jamón extra" />
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="text-sm text-gray-900">
              Pan repuesto <span className="text-xs text-gray-500">(se cobra, {euros(PAN_EXTRA)} la ración)</span>
            </span>
            <Stepper value={panExtra} onChange={setPanExtra} label="raciones de pan repuestas" />
          </div>
          <label className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm text-gray-900">Señal ya pagada</span>
            <span className="inline-flex items-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={senal}
                onChange={(e) => setSenal(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="0"
                className="h-11 w-24 rounded-xl border border-gray-200 px-3 text-right text-base tabular-nums outline-none focus:border-gray-400"
              />
              <span className="text-sm text-gray-500">€</span>
            </span>
          </label>
        </div>
      </Seccion>

      {/* 6 · Total */}
      <section className="rounded-2xl bg-gray-900 p-5 text-white" aria-live="polite">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total</h2>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-300">
              {personas} × {euros(precio)} {bebida ? "(con bebida)" : "(sin bebida)"}
            </dt>
            <dd className="tabular-nums">{euros(cuentas.base)}</dd>
          </div>
          {cuentas.sup.map((s) => (
            <div key={s.opcion.id} className="flex justify-between gap-3">
              <dt className="text-gray-300">
                {s.n} × {s.opcion.nombre.split(" ")[0].toLowerCase()} +{euros(s.opcion.suplemento ?? 0)}
              </dt>
              <dd className="tabular-nums">{euros(s.importe)}</dd>
            </div>
          ))}
          {cuentas.jamon > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-gray-300">{jamonExtra} × tabla de jamón</dt>
              <dd className="tabular-nums">{euros(cuentas.jamon)}</dd>
            </div>
          )}
          {cuentas.pan > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-gray-300">{panExtra} × pan repuesto</dt>
              <dd className="tabular-nums">{euros(cuentas.pan)}</dd>
            </div>
          )}
          {cuentas.senalNum > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-gray-300">Señal ya pagada</dt>
              <dd className="tabular-nums">−{euros(cuentas.senalNum)}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/15 pt-4">
          <span className="text-sm text-gray-300">{cuentas.senalNum > 0 ? "A cobrar" : "Total a cobrar"}</span>
          <span className="text-3xl font-bold tabular-nums">{euros(cuentas.aCobrar)}</span>
        </div>
        <button
          type="button"
          onClick={copiar}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-gray-900"
        >
          {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiado ? "Copiado" : "Copiar resumen para cocina o WhatsApp"}
        </button>
      </section>
    </div>
  );
}
