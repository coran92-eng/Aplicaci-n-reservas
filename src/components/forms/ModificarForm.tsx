"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { modificarReserva } from "@/actions/reservas";

function getMonthLabel(year: number, month: number, locale: string) {
  const code = locale === "ca" ? "ca-ES" : locale === "en" ? "en-GB" : "es-ES";
  return new Date(year, month - 1, 1).toLocaleDateString(code, { month: "long", year: "numeric" });
}

function getDayHeaders(locale: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2025, 0, 6 + i);
    const code = locale === "ca" ? "ca-ES" : locale === "en" ? "en-GB" : "es-ES";
    return d.toLocaleDateString(code, { weekday: "short" }).slice(0, 2);
  });
}

function pad(n: number) { return String(n).padStart(2, "0"); }

interface Props {
  token: string;
  locale: string;
  today: string;
  maxDate: string;
  closedDates: Set<string>;
  franjasBloqueadas: { fecha: string; hora: string }[];
  allSlots: string[];
}

export function ModificarForm({ token, locale, today, maxDate, closedDates, franjasBloqueadas, allSlots }: Props) {
  const t = useTranslations("modification");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const [ty, tm, td] = today.split("-").map(Number);
  const [my, mm, md] = maxDate.split("-").map(Number);

  function isDisabled(day: number) {
    const str = `${calYear}-${pad(calMonth)}-${pad(day)}`;
    if (calYear < ty || (calYear === ty && calMonth < tm) || (calYear === ty && calMonth === tm && day < td)) return true;
    if (calYear > my || (calYear === my && calMonth > mm) || (calYear === my && calMonth === mm && day > md)) return true;
    if (closedDates.has(str)) return true;
    return false;
  }

  const firstDow = (new Date(calYear, calMonth - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const blockedOnDate = selectedDate
    ? new Set(franjasBloqueadas.filter((f) => f.fecha === selectedDate).map((f) => f.hora.slice(0, 5)))
    : new Set<string>();

  const availableSlots = allSlots.filter((s) => !blockedOnDate.has(s));

  async function handleSubmit() {
    if (!selectedDate || !selectedTime) return;
    setSaving(true);
    setError(null);
    const result = await modificarReserva(token, { fecha: selectedDate, hora: selectedTime });
    setSaving(false);
    if (result.ok) {
      setSuccess(true);
    } else {
      const key = `error_${result.error}` as Parameters<typeof t>[0];
      try { setError(t(key)); } catch { setError(t("error_generic")); }
    }
  }

  if (success) {
    return (
      <div className="rounded-lg bg-green-900/20 border border-green-700/40 p-4 text-center">
        <p className="text-sm text-green-400 font-medium">{t("success")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Calendar */}
      <div className="rounded-xl border border-border p-4 bg-card">
        <div className="flex items-center justify-between mb-4">
          <button type="button"
            onClick={() => { if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); } else setCalMonth(m => m - 1); }}
            className="p-2 rounded-full hover:bg-accent transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-medium capitalize text-base">{getMonthLabel(calYear, calMonth, locale)}</span>
          <button type="button"
            onClick={() => { if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); } else setCalMonth(m => m + 1); }}
            className="p-2 rounded-full hover:bg-accent transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {getDayHeaders(locale).map((h) => (
            <div key={h} className="text-center text-xs text-muted-foreground font-medium py-1 capitalize">{h}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />;
            const disabled = isDisabled(day);
            const dateStr = `${calYear}-${pad(calMonth)}-${pad(day)}`;
            const selected = selectedDate === dateStr;
            const isToday = calYear === ty && calMonth === tm && day === td;
            return (
              <button
                key={day}
                type="button"
                disabled={disabled}
                onClick={() => { setSelectedDate(dateStr); setSelectedTime(null); }}
                className={[
                  "mx-auto w-10 h-10 flex items-center justify-center rounded-full text-sm transition-colors",
                  disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                  selected ? "bg-primary text-primary-foreground" : "",
                  !disabled && !selected ? "hover:bg-accent" : "",
                  isToday && !selected ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "",
                ].filter(Boolean).join(" ")}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="grid grid-cols-4 gap-2">
          {availableSlots.map((slot) => (
            <button key={slot} type="button" onClick={() => setSelectedTime(slot)}
              className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-colors
                ${selectedTime === slot
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary text-foreground"}`}>
              {slot}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-950/30 border border-red-700/40 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <Button
        size="lg"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        disabled={!selectedDate || !selectedTime || saving}
        onClick={handleSubmit}
      >
        {saving ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}
