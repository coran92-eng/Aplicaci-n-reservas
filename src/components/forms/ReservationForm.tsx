"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reservaSchema, type ReservaInput } from "@/lib/validations";
import { createReserva, getAvailableSlots } from "@/actions/reservas";
import { generateTimeSlots, todayBarcelona, addDaysToDate, nowBarcelona } from "@/lib/utils";
import type { FranjaBloqueada, DiaCerrado } from "@/lib/supabase/types";
import Link from "next/link";

function localeCode(locale: string) {
  return locale === "ca" ? "ca-ES" : locale === "en" ? "en-GB" : "es-ES";
}

function getMonthLabel(year: number, month: number, locale: string) {
  return new Date(year, month - 1, 1).toLocaleDateString(localeCode(locale), {
    month: "long",
    year: "numeric",
  });
}

function getDayHeaders(locale: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2025, 0, 6 + i);
    return d.toLocaleDateString(localeCode(locale), { weekday: "short" }).slice(0, 2);
  });
}

function formatDateShort(dateStr: string, locale: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(localeCode(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

interface CalendarProps {
  year: number;
  month: number;
  selectedDate: string | null;
  today: string;
  maxDate: string;
  closedDates: Set<string>;
  locale: string;
  dayOccupancy: Record<string, number>;
  topePersonas: number;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

function Calendar({ year, month, selectedDate, today, maxDate, closedDates, locale, dayOccupancy, topePersonas, onSelect, onPrev, onNext }: CalendarProps) {
  const dayHeaders = getDayHeaders(locale);
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const [ty, tm, td] = today.split("-").map(Number);
  const [my, mm, md] = maxDate.split("-").map(Number);

  function pad(n: number) { return String(n).padStart(2, "0"); }
  function toStr(d: number) { return `${year}-${pad(month)}-${pad(d)}`; }

  function isDisabled(d: number) {
    if (year < ty || (year === ty && month < tm) || (year === ty && month === tm && d < td)) return true;
    if (year > my || (year === my && month > mm) || (year === my && month === mm && d > md)) return true;
    if (closedDates.has(toStr(d))) return true;
    return false;
  }

  function availabilityDot(d: number) {
    const dateStr = toStr(d);
    const occupied = dayOccupancy[dateStr] ?? 0;
    // Approximate daily capacity (assume ~3 lunch slots + 3 dinner slots)
    const dailyCap = topePersonas * 6;
    const ratio = occupied / dailyCap;
    if (ratio >= 0.9) return "bg-red-500";
    if (ratio >= 0.6) return "bg-amber-400";
    return "bg-green-500";
  }

  const canGoPrev = year > new Date().getFullYear() || (year === new Date().getFullYear() && month > new Date().getMonth() + 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={onPrev} disabled={!canGoPrev}
          className="p-2 rounded-full hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-medium capitalize text-base">{getMonthLabel(year, month, locale)}</span>
        <button type="button" onClick={onNext}
          className="p-2 rounded-full hover:bg-accent transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {dayHeaders.map((h) => (
          <div key={h} className="text-center text-xs text-muted-foreground font-medium py-1 capitalize">{h}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const disabled = isDisabled(day);
          const selected = selectedDate === toStr(day);
          const isToday = year === ty && month === tm && day === td;
          const dotColor = !disabled ? availabilityDot(day) : null;
          return (
            <div key={day} className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(toStr(day))}
                className={[
                  "w-10 h-10 flex items-center justify-center rounded-full text-sm transition-colors",
                  disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                  selected ? "bg-primary text-primary-foreground" : "",
                  !disabled && !selected ? "hover:bg-accent" : "",
                  isToday && !selected ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "",
                ].filter(Boolean).join(" ")}
              >
                {day}
              </button>
              {dotColor && !selected && (
                <span className={`w-1 h-1 rounded-full ${dotColor}`} aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ALERGIAS_KEYS = ["vegano", "celiaco", "lactosa", "frutos_secos"] as const;

interface Props {
  franjasBloqueadas: FranjaBloqueada[];
  diasCerrados: DiaCerrado[];
  limiteGrupo: number;
  antelacionMax: number;
  topePersonas: number;
  dayOccupancy: Record<string, number>;
  embed?: boolean;
}

type EmbedSuccess = {
  estado: string;
  fecha: string;
  hora: string;
  personas: number;
  nombre: string;
};

export function ReservationForm({ franjasBloqueadas, diasCerrados, limiteGrupo, antelacionMax, topePersonas, dayOccupancy, embed }: Props) {
  const t = useTranslations("form");
  const tConf = useTranslations("confirmation");
  const locale = useLocale();
  const router = useRouter();

  const today = todayBarcelona();
  const maxDate = addDaysToDate(today, antelacionMax);
  const closedDates = new Set(diasCerrados.map((d) => d.fecha));

  const now = new Date();
  const [step, setStep] = useState<1 | 2>(1);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [personas, setPersonas] = useState(2);
  const [serverError, setServerError] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [embedSuccess, setEmbedSuccess] = useState<EmbedSuccess | null>(null);
  const timeSlotsRef = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setValue, trigger, watch, formState: { errors } } = useForm<ReservaInput>({
    resolver: zodResolver(reservaSchema),
    shouldUnregister: false,
    defaultValues: {
      idioma: locale as "es" | "ca" | "en",
      personas: 2,
      consentimiento: false,
      alergias: [],
    },
  });

  const allSlots = generateTimeSlots();

  const availableSlots = (() => {
    if (!selectedDate) return allSlots;
    const blocked = new Set(
      franjasBloqueadas.filter((f) => f.fecha === selectedDate).map((f) => f.hora.slice(0, 5))
    );
    const nowMins = selectedDate === today
      ? (() => { const n = nowBarcelona(); return n.getHours() * 60 + n.getMinutes(); })()
      : -1;
    return allSlots.filter((slot) => {
      if (blocked.has(slot)) return false;
      if (nowMins >= 0) {
        const [hh, mm] = slot.split(":").map(Number);
        if (hh === 0) return true;
        if (hh * 60 + mm - nowMins < 15) return false;
      }
      return true;
    });
  })();

  useEffect(() => {
    if (selectedDate && timeSlotsRef.current) {
      setTimeout(() => timeSlotsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (step === 2 && step2Ref.current) {
      const first = step2Ref.current.querySelector<HTMLElement>(
        "button:not([disabled]), [href], input, select, textarea"
      );
      first?.focus();
    }
  }, [step]);

  // Step 1 → 2: validate fecha + hora are set
  async function handleContinue() {
    if (!selectedDate || !selectedTime) {
      await trigger(["fecha", "hora"]);
      return;
    }
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "conversion", { send_to: "AW-18213186788/quoPCPPF07kcEOTZ3OxD" });
    }
    setStep(2);
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    setSelectedTime(null);
    setAlternatives([]);
    setValue("fecha", date, { shouldValidate: true });
    setValue("hora", "", { shouldValidate: false });
  }

  function handleTimeSelect(time: string) {
    setSelectedTime(time);
    setServerError(null);
    setAlternatives([]);
    setValue("hora", time, { shouldValidate: true });
  }

  function handlePersonas(p: number) {
    setPersonas(p);
    setValue("personas", p, { shouldValidate: true });
  }

  function prevMonth() {
    if (calMonth === 1) { setCalYear(calYear - 1); setCalMonth(12); }
    else setCalMonth(calMonth - 1);
  }

  function nextMonth() {
    if (calMonth === 12) { setCalYear(calYear + 1); setCalMonth(1); }
    else setCalMonth(calMonth + 1);
  }

  async function onSubmit(data: ReservaInput) {
    setSubmitting(true);
    setServerError(null);
    setDbError(null);
    setAlternatives([]);
    try {
      const result = await createReserva(data);
      if (!result.ok) {
        setServerError(result.error ?? "generic");
        if ("dbError" in result && result.dbError) setDbError(result.dbError);
        if (result.error === "franja_bloqueada" && selectedDate) {
          getAvailableSlots(selectedDate, personas)
            .then((slots) => setAlternatives(slots.filter((s) => s !== selectedTime)))
            .catch(() => {});
        }
        return;
      }
      const qs = new URLSearchParams({ token: result.cancelToken });
      if (result.emailError) qs.set("emailError", result.emailError);
      const destPath = result.estado === "pendiente_aprobacion"
        ? `/${locale}/solicitud-recibida/${result.id}?${qs}`
        : `/${locale}/confirmada/${result.id}?${qs}`;
      if (embed) {
        window.parent.postMessage({ type: 'reserva_confirmada' }, '*');
        // Use absolute URL so the parent navigates to reservas.cortedemanga.es, not its own origin
        const absoluteUrl = window.location.origin + destPath;
        try {
          window.top!.location.href = absoluteUrl;
        } catch {
          window.location.href = absoluteUrl;
        }
        return;
      }
      router.push(destPath);
    } catch {
      setServerError("generic");
    } finally {
      setSubmitting(false);
    }
  }

  function onValidationError(errs: typeof errors) {
    const step1Fields = ["fecha", "hora"] as const;
    const hasStep1Error = step1Fields.some((f) => errs[f]);
    if (hasStep1Error) setStep(1);
  }

  function errMsg(key: string | undefined): string | null {
    if (!key) return null;
    try {
      if (key === "fecha_max") return t("errors.fecha_max", { dias: antelacionMax });
      if (key === "personas_max") return t("errors.personas_max", { max: limiteGrupo });
      return t(`errors.${key}` as Parameters<typeof t>[0]);
    } catch { return t("errors.generic"); }
  }

  if (embed && embedSuccess) {
    const isPending = embedSuccess.estado === "pendiente_aprobacion";
    const dateLabel = formatDateShort(embedSuccess.fecha, locale);
    return (
      <div className="py-8 text-center space-y-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto">
          <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="font-heading text-xl font-bold text-foreground">
            {isPending ? tConf("title_pending") : tConf("title")}
          </h3>
          <p className="text-muted-foreground text-sm mt-1">
            {tConf("subtitle")}
          </p>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 text-left text-sm space-y-2 max-w-xs mx-auto">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tConf("date")}</span>
            <span className="font-medium text-foreground">{dateLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tConf("time")}</span>
            <span className="font-medium text-foreground">{embedSuccess.hora}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tConf("people")}</span>
            <span className="font-medium text-foreground">{embedSuccess.personas}</span>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          {tConf("cancel_info")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onValidationError)} noValidate>
      {/* Honeypot */}
      <div style={{ position: "absolute", left: "-9999px" }} aria-hidden>
        <input type="text" {...register("website")} tabIndex={-1} autoComplete="off" />
      </div>
      {/* Hidden synced fields */}
      <input type="hidden" {...register("idioma")} value={locale} />
      <input type="hidden" {...register("fecha")} />
      <input type="hidden" {...register("hora")} />
      <input type="hidden" {...register("personas", { valueAsNumber: true })} />

      {/* Step indicator — step 1 = Disponibilidad, step 2 = Tus datos */}
      <div className="flex items-center gap-2 mb-7 select-none">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>1</div>
        <span className={`text-sm ${step === 1 ? "font-medium text-foreground" : "text-muted-foreground"}`}>{t("paso_fecha")}</span>
        <div className="flex-1 h-px bg-border" />
        <span className={`text-sm ${step === 2 ? "font-medium text-foreground" : "text-muted-foreground"}`}>{t("paso_datos")}</span>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
      </div>

      {/* ── STEP 1: Disponibilidad ── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Personas */}
          <div>
            <p className="text-sm font-medium mb-3 text-foreground">{t("personas")}</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: limiteGrupo }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" onClick={() => handlePersonas(n)}
                  className={`w-10 h-10 rounded-full text-sm font-medium border-2 transition-colors
                    ${personas === n ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary text-foreground"}`}>
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => handlePersonas(limiteGrupo + 1)}
                className={`px-3 h-10 rounded-full text-sm font-medium border-2 transition-colors
                  ${personas > limiteGrupo ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary text-foreground"}`}>
                {limiteGrupo + 1}+
              </button>
            </div>
            {personas > limiteGrupo && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-foreground">{t("personas_grupo")}</label>
                  <input
                    type="number"
                    min={limiteGrupo + 1}
                    max={50}
                    value={personas}
                    onChange={e => {
                      const v = Math.max(limiteGrupo + 1, Math.min(50, Number(e.target.value) || limiteGrupo + 1));
                      handlePersonas(v);
                    }}
                    className="w-20 rounded-lg border-2 border-primary bg-transparent px-3 py-1.5 text-sm font-semibold text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="rounded-lg bg-amber-900/20 border border-amber-700/40 px-4 py-3">
                  <p className="text-sm text-amber-400">{t("group_warning", { limite: limiteGrupo })}</p>
                </div>
              </div>
            )}
          </div>

          {/* Calendar */}
          <div className="rounded-xl border border-border p-4 bg-card">
            <Calendar
              year={calYear} month={calMonth}
              selectedDate={selectedDate}
              today={today} maxDate={maxDate}
              closedDates={closedDates} locale={locale}
              dayOccupancy={dayOccupancy}
              topePersonas={topePersonas}
              onSelect={handleDateSelect}
              onPrev={prevMonth} onNext={nextMonth}
            />
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div ref={timeSlotsRef}>
              <p className="text-sm font-medium mb-3 text-foreground">
                {t("hora_seccion")}
                <span className="font-normal text-muted-foreground ml-2 capitalize">
                  {formatDateShort(selectedDate, locale)}
                </span>
              </p>
              {availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">{t("no_slots")}</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button key={slot} type="button" onClick={() => handleTimeSelect(slot)}
                      className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-colors
                        ${selectedTime === slot
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary text-foreground"}`}>
                      {slot}
                    </button>
                  ))}
                </div>
              )}
              {availableSlots.some((s) => s.startsWith("00:")) && (
                <p className="mt-2 text-xs text-muted-foreground">{t("midnight_note")}</p>
              )}
              {errors.hora && <p className="mt-2 text-xs text-destructive">{errMsg(errors.hora.message)}</p>}
            </div>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!selectedDate || !selectedTime}
            onClick={handleContinue}
          >
            {t("continuar")} →
          </Button>
        </div>
      )}

      {/* ── STEP 2: Datos personales ── */}
      {step === 2 && (
        <div className="space-y-5" ref={step2Ref}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">{t("nombre")} *</Label>
              <Input id="nombre" autoComplete="given-name" {...register("nombre")} aria-invalid={!!errors.nombre} aria-describedby={errors.nombre ? "nombre-error" : undefined} />
              {errors.nombre && <p id="nombre-error" className="text-xs text-destructive">{errMsg(errors.nombre.message)}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apellido">{t("apellido")} *</Label>
              <Input id="apellido" autoComplete="family-name" {...register("apellido")} aria-invalid={!!errors.apellido} aria-describedby={errors.apellido ? "apellido-error" : undefined} />
              {errors.apellido && <p id="apellido-error" className="text-xs text-destructive">{errMsg(errors.apellido.message)}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">{t("email")} *</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
            {errors.email && <p id="email-error" className="text-xs text-destructive">{errMsg(errors.email.message)}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telefono">{t("telefono")} *</Label>
            <Input
              id="telefono"
              type="tel"
              autoComplete="tel"
              placeholder="+34 600 000 000"
              defaultValue=""
              aria-invalid={!!errors.telefono}
              aria-describedby={errors.telefono ? "telefono-error" : undefined}
              onChange={(e) => setValue("telefono", e.target.value, { shouldValidate: false })}
              onBlur={(e) => {
                const val = e.target.value;
                try {
                  const parsed = parsePhoneNumberFromString(val, "ES");
                  if (parsed?.isValid()) {
                    setValue("telefono", parsed.format("E.164"), { shouldValidate: true });
                    e.target.value = parsed.formatInternational();
                  } else {
                    setValue("telefono", val, { shouldValidate: true });
                  }
                } catch {
                  setValue("telefono", val, { shouldValidate: true });
                }
              }}
            />
            {errors.telefono && <p id="telefono-error" className="text-xs text-destructive">{errMsg(errors.telefono.message)}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">{t("notas")}</Label>
            <Textarea id="notas" placeholder={t("notas_placeholder")} rows={2} {...register("notas_cliente")} />
            {errors.notas_cliente && <p className="text-xs text-destructive">{errMsg(errors.notas_cliente.message)}</p>}
          </div>

          <div className="flex items-start gap-3">
            <input id="consentimiento" type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer"
              {...register("consentimiento")} />
            <Label htmlFor="consentimiento" className="text-sm font-normal cursor-pointer leading-snug">
              {t("consentimiento")}{" "}
              <Link href={`/${locale}/privacidad`} target="_blank" className="underline">{t("politica_privacidad")}</Link>
            </Label>
          </div>
          {errors.consentimiento && <p className="text-xs text-destructive">{errMsg(errors.consentimiento.message)}</p>}

          {/* Server error */}
          {serverError && (
            <div className="rounded-lg bg-red-950/30 border border-red-700/40 px-4 py-3">
              <p className="text-sm text-red-400">{errMsg(serverError) ?? t("errors.generic")}</p>
              {process.env.NODE_ENV !== "production" && dbError && (
                <p className="text-xs text-red-300 mt-1 font-mono break-all">Error: {dbError}</p>
              )}
            </div>
          )}

          {/* Horas alternativas */}
          {serverError === "franja_bloqueada" && alternatives.length > 0 && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">{t("alternativas")}</p>
              <div className="flex flex-wrap gap-2">
                {alternatives.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleTimeSelect(slot)}
                    className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={submitting}>
            {submitting ? t("submitting") : t("submit")}
          </Button>

          <button type="button" onClick={() => setStep(1)}
            className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1 transition-colors">
            ← {t("volver")}
          </button>
        </div>
      )}
    </form>
  );
}
