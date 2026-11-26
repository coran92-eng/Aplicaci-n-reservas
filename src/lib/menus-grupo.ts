// Menús de grupo y cantidades para la calculadora del panel (/admin/grupos).
// Cantidades acordadas con Coran el 26/11/2026:
//   - entrantes al centro: 1 plato cada 4 personas, por mesa; se sube a partir de medio plato
//     (5 personas → 1 plato, 6 → 2, 10 → 3);
//   - pan de coca con tomate: 1 ración (6 rebanadas) cada 3 personas, siempre hacia arriba;
//     si una mesa pide más, se cobra aparte;
//   - croquetas, 2 por persona; gildas, 1 por persona (en platos, 1 plato cada 4 personas);
//   - segundo y postre: 1 por persona, el que elija cada uno.
// Para cambiar una cantidad o un precio, se cambia aquí y nada más.

export type Regla =
  /** 1 plato (o ración, tabla, lata…) cada `cada` personas */
  | { tipo: "platos"; cada: number; redondeo: "medio" | "arriba"; unidad: [string, string] }
  /** `porPersona` unidades por persona, repartidas en platos (1 plato cada `platoCada` personas) */
  | { tipo: "porPersona"; porPersona: number; platoCada: number; unidad: [string, string] };

export interface Entrante {
  id: string;
  nombre: string;
  regla: Regla;
  nota?: string;
}

export interface Opcion {
  id: string;
  nombre: string;
  /** € por persona que lo elige */
  suplemento?: number;
}

export interface MenuGrupo {
  id: "essencial" | "corte" | "taula";
  nombre: string;
  precio: number;
  precioBebida: number;
  minimo: number;
  entrantes: Entrante[];
  segundos: Opcion[];
  postres: Opcion[];
  /** Tabla de jamón como extra (€ por tabla «para dos»); sin valor si va incluido */
  extraJamon?: number;
}

/** Ración de pan de coca con tomate repuesta: se cobra como en la carta */
export const PAN_EXTRA = 5;

const PAN: Entrante = {
  id: "pan",
  nombre: "Pan de coca con tomate",
  regla: { tipo: "platos", cada: 3, redondeo: "arriba", unidad: ["ración", "raciones"] },
  nota: "6 rebanadas por ración. Si piden más, se cobra.",
};
const BRAVAS: Entrante = {
  id: "bravas",
  nombre: "Patatas bravas",
  regla: { tipo: "platos", cada: 4, redondeo: "medio", unidad: ["plato", "platos"] },
};
const CROQUETAS: Entrante = {
  id: "croquetas",
  nombre: "Croquetas variadas",
  regla: { tipo: "porPersona", porPersona: 2, platoCada: 4, unidad: ["croqueta", "croquetas"] },
  nota: "Mezclando sabores en cada plato.",
};
const ENSALADILLA: Entrante = {
  id: "ensaladilla",
  nombre: "Ensaladilla rusa",
  regla: { tipo: "platos", cada: 4, redondeo: "medio", unidad: ["plato", "platos"] },
};
const TIRAS: Entrante = {
  id: "tiras",
  nombre: "Tiras de pollo con miel y mostaza",
  regla: { tipo: "platos", cada: 4, redondeo: "medio", unidad: ["plato", "platos"] },
};
const COCA_BURRATA: Entrante = {
  id: "coca-burrata",
  nombre: "Coca con burrata, pesto y jamón serrano",
  regla: { tipo: "platos", cada: 4, redondeo: "medio", unidad: ["coca", "cocas"] },
};
const JAMON: Entrante = {
  id: "jamon",
  nombre: "Jamón de cebo ibérico cortado a cuchillo",
  regla: { tipo: "platos", cada: 4, redondeo: "medio", unidad: ["tabla", "tablas"] },
  nota: "Tabla «para dos» de la carta.",
};
const CONSERVAS: Entrante = {
  id: "conservas",
  nombre: "Selección de conservas",
  regla: { tipo: "platos", cada: 4, redondeo: "medio", unidad: ["lata", "latas"] },
  nota: "Cambiando de variedad. Mejor mejillones, almejas y pulpo; los berberechos son la lata más cara.",
};
const GILDAS: Entrante = {
  id: "gildas",
  nombre: "Gildas del Cantábrico",
  regla: { tipo: "porPersona", porPersona: 1, platoCada: 4, unidad: ["gilda", "gildas"] },
};

export const MENUS_GRUPO: MenuGrupo[] = [
  {
    id: "essencial",
    nombre: "Essencial",
    precio: 32,
    precioBebida: 44,
    minimo: 4,
    entrantes: [PAN, BRAVAS, CROQUETAS, ENSALADILLA],
    segundos: [
      { id: "albondigas", nombre: "Albóndigas a la catalana" },
      { id: "burrata", nombre: "Burrata Secchiello" },
      { id: "carpaccio", nombre: "Carpaccio de ternera", suplemento: 2 },
    ],
    postres: [
      { id: "coulant-choco", nombre: "Coulant de chocolate" },
      { id: "brownie", nombre: "Brownie" },
    ],
    extraJamon: 25,
  },
  {
    id: "corte",
    nombre: "Corte de Manga",
    precio: 38,
    precioBebida: 50,
    minimo: 4,
    entrantes: [PAN, BRAVAS, CROQUETAS, TIRAS, ENSALADILLA, COCA_BURRATA],
    segundos: [
      { id: "albondigas", nombre: "Albóndigas a la catalana" },
      { id: "carpaccio", nombre: "Carpaccio de ternera", suplemento: 2 },
      { id: "canelones", nombre: "Canelones de setas con bechamel de trufa", suplemento: 3 },
    ],
    postres: [
      { id: "coulant-choco", nombre: "Coulant de chocolate" },
      { id: "tarta-queso", nombre: "Tarta de queso manchego" },
      { id: "brownie", nombre: "Brownie" },
    ],
    extraJamon: 25,
  },
  {
    id: "taula",
    nombre: "Taula Plena",
    precio: 48,
    precioBebida: 60,
    minimo: 8,
    entrantes: [PAN, JAMON, BRAVAS, CROQUETAS, COCA_BURRATA, CONSERVAS, GILDAS],
    segundos: [
      { id: "canelones", nombre: "Canelones de setas con bechamel de trufa" },
      { id: "carpaccio", nombre: "Carpaccio de ternera" },
      { id: "alcachofas", nombre: "Alcachofas de Tudela confitadas" },
    ],
    postres: [
      { id: "tarta-queso", nombre: "Tarta de queso manchego" },
      { id: "coulant-queso", nombre: "Coulant de queso manchego" },
      { id: "sacher", nombre: "Tarta Sacher" },
    ],
  },
];

// ── Cálculos ───────────────────────────────────────────────────

/** Platos de un entrante para una mesa de `personas` */
export function platosMesa(regla: Regla, personas: number): number {
  if (personas <= 0) return 0;
  if (regla.tipo === "porPersona") return Math.max(1, Math.floor(personas / regla.platoCada + 0.5));
  if (regla.redondeo === "arriba") return Math.ceil(personas / regla.cada);
  return Math.max(1, Math.floor(personas / regla.cada + 0.5));
}

/** Unidades (croquetas, gildas) para una mesa; 0 si el entrante va por platos */
export function unidadesMesa(regla: Regla, personas: number): number {
  return regla.tipo === "porPersona" && personas > 0 ? regla.porPersona * personas : 0;
}

/** Reparte unidades en platos lo más igual posible: 13 en 2 → [7, 6] */
export function repartir(unidades: number, platos: number): number[] {
  if (platos <= 0) return [];
  const base = Math.floor(unidades / platos);
  const resto = unidades % platos;
  return Array.from({ length: platos }, (_, i) => base + (i < resto ? 1 : 0));
}

/** Reparte personas en mesas lo más igual posible: 20 en 3 → [7, 7, 6] */
export function repartirMesas(personas: number, mesas: number): number[] {
  return repartir(Math.max(personas, mesas), mesas);
}

export function reglaTexto(regla: Regla): string {
  if (regla.tipo === "porPersona") {
    return `${regla.porPersona} ${regla.porPersona === 1 ? regla.unidad[0] : regla.unidad[1]} por persona · 1 plato cada ${regla.platoCada}`;
  }
  return `1 ${regla.unidad[0]} cada ${regla.cada} personas${regla.redondeo === "arriba" ? " (hacia arriba)" : ""}`;
}

export const euros = (n: number) =>
  `${n.toLocaleString("es-ES", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
