import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, addDays } from "date-fns";
import { es, ca, enUS } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const localeMap = { es, ca, en: enUS };

export function formatDate(
  date: string | Date,
  fmt: string,
  locale: string = "es"
): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt, {
    locale: localeMap[locale as keyof typeof localeMap] ?? es,
  });
}

export function formatTime(hora: string): string {
  return hora.slice(0, 5);
}

export function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0).toUpperCase()}.${apellido.charAt(0).toUpperCase()}.`;
}

export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  // 08:30 → 23:45
  for (let h = 8; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 8 && m < 30) continue;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  // 00:00 → 00:45 (madrugada)
  for (let m = 0; m < 60; m += 15) {
    slots.push(`00:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

export function isMidnightSlot(hora: string): boolean {
  const h = parseInt(hora.split(":")[0]);
  return h === 0;
}

export function todayBarcelona(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(
    new Date()
  );
}

export function nowBarcelona(): Date {
  // Construir fecha correcta con DST de Europe/Madrid usando Intl
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  return new Date(
    parseInt(get("year")),
    parseInt(get("month")) - 1,
    parseInt(get("day")),
    parseInt(get("hour")),
    parseInt(get("minute")),
    parseInt(get("second"))
  );
}

export function dateToISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function addDaysToDate(date: string, days: number): string {
  return dateToISO(addDays(parseISO(date), days));
}
