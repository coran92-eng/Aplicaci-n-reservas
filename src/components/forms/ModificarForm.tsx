"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { modificarReserva } from "@/actions/reservas";
function getMonthLabel(year: number, month: number, locale: string) {
  const code = locale === "ca" ? "ca-ES" : locale === "en" ? "en-GB" : "es-ES";
  const s = new Date(year, month - 1, 1).toLocaleDateString(code, { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dayLabel(dateStr: string, locale: string) {
  const code = locale === "ca" ? "ca-ES" : locale === "en" ? "en-GB" : "es-ES";
  const s = new Date(dateStr + "T00:00:00").toLocaleDateString(code, { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  const tf = useTranslations("form");
  const currentLocale = useLocale(); // fallback if locale prop not forwarded
  const router = useRouter();
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
      router.push(`/${locale || currentLocale}/confirmada/${result.reservaId}?token=${encodeURIComponent(result.newToken)}`);
      return;
    } else {
      const key = `error_${result.error}` as Parameters<typeof t>[0];
      try { setError(t(key)); } catch { setError(t("error_generic")); }
    }
  }

  if (success) {
    return (
      <p className="cdm-ok" role="status">{t("success")}</p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Calendario */}
      <div className="cdm-cal">
        <div className="cdm-calnav">
          <button type="button" aria-label={tf("mes_anterior")}
            onClick={() => { if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); } else setCalMonth(m => m - 1); }}>
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <span aria-live="polite">{getMonthLabel(calYear, calMonth, locale)}</span>
          <button type="button" aria-label={tf("mes_siguiente")}
            onClick={() => { if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); } else setCalMonth(m => m + 1); }}>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="cdm-dow" aria-hidden>
          {getDayHeaders(locale).map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        <div className="cdm-days">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />;
            const disabled = isDisabled(day);
            const dateStr = `${calYear}-${pad(calMonth)}-${pad(day)}`;
            const selected = selectedDate === dateStr;
            const isToday = calYear === ty && calMonth === tm && day === td;
            return (
              <div key={day}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={dayLabel(dateStr, locale)}
                  onClick={() => { setSelectedDate(dateStr); setSelectedTime(null); }}
                  className={["cdm-day", selected ? "is-on" : "", isToday && !selected ? "is-today" : ""].filter(Boolean).join(" ")}
                >
                  {day}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Horas */}
      {selectedDate && (
        <div className="cdm-slots" role="group" aria-label={tf("hora_seccion")}>
          {availableSlots.map((slot) => (
            <button key={slot} type="button" onClick={() => setSelectedTime(slot)} aria-pressed={selectedTime === slot}
              className={`cdm-pick ${selectedTime === slot ? "is-on" : ""}`}>
              {slot}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="cdm-err" role="alert">{error}</p>
      )}

      <Button
        size="lg"
        className="cdm-btn w-full"
        disabled={!selectedDate || !selectedTime || saving}
        onClick={handleSubmit}
      >
        {saving ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}
