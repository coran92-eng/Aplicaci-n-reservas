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

function upperFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getMonthLabel(year: number, month: number, locale: string) {
  return upperFirst(new Date(year, month - 1, 1).toLocaleDateString(localeCode(locale), {
    month: "long",
    year: "numeric",
  }));
}

function getDayHeaders(locale: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2025, 0, 6 + i);
    return d.toLocaleDateString(localeCode(locale), { weekday: "short" }).slice(0, 2);
  });
}

function formatDateShort(dateStr: string, locale: string) {
  return upperFirst(new Date(dateStr + "T00:00:00").toLocaleDateString(localeCode(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
  }));
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
  prevLabel: string;
  nextLabel: string;
}

function Calendar({ year, month, selectedDate, today, maxDate, closedDates, locale, dayOccupancy, topePersonas, onSelect, onPrev, onNext, prevLabel, nextLabel }: CalendarProps) {
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
    if (ratio >= 0.9) return "hi";
    if (ratio >= 0.6) return "mid";
    return "ok";
  }

  const canGoPrev = year > new Date().getFullYear() || (year === new Date().getFullYear() && month > new Date().getMonth() + 1);

  return (
    <div className="cdm-cal">
      <div className="cdm-calnav">
        <button type="button" onClick={onPrev} disabled={!canGoPrev} aria-label={prevLabel}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <span aria-live="polite">{getMonthLabel(year, month, locale)}</span>
        <button type="button" onClick={onNext} aria-label={nextLabel}>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="cdm-dow" aria-hidden>
        {dayHeaders.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>

      <div className="cdm-days">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const disabled = isDisabled(day);
          const selected = selectedDate === toStr(day);
          const isToday = year === ty && month === tm && day === td;
          const dotColor = !disabled ? availabilityDot(day) : null;
          return (
            <div key={day}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(toStr(day))}
                aria-pressed={selected}
                aria-label={formatDateShort(toStr(day), locale)}
                className={["cdm-day", selected ? "is-on" : "", isToday && !selected ? "is-today" : ""].filter(Boolean).join(" ")}
              >
                {day}
              </button>
              {dotColor && !selected && <span className={`cdm-dot ${dotColor}`} aria-hidden />}
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
        // Notificar a la web padre (cortedemanga.es) que la reserva se ha completado
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'cmReservaConfirmada' }, 'https://cortedemanga.es');
        }
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
      if (key === "Required") return t("errors.required");
      return t(`errors.${key}` as Parameters<typeof t>[0]);
    } catch { return t("errors.generic"); }
  }

  if (embed && embedSuccess) {
    const isPending = embedSuccess.estado === "pendiente_aprobacion";
    const dateLabel = formatDateShort(embedSuccess.fecha, locale);
    return (
      <div className="cdm-center">
        <div className="cdm-badge" aria-hidden>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="cdm-big">{isPending ? tConf("title_pending") : tConf("title")}</h2>
        <p className="cdm-sub">{tConf("subtitle")}</p>
        <dl className="cdm-dl" style={{ marginTop: 18, textAlign: "left" }}>
          <div>
            <dt>{tConf("date")}</dt>
            <dd>{dateLabel}</dd>
          </div>
          <div>
            <dt>{tConf("time")}</dt>
            <dd>{embedSuccess.hora}</dd>
          </div>
          <div>
            <dt>{tConf("people")}</dt>
            <dd>{embedSuccess.personas}</dd>
          </div>
        </dl>
        <p className="cdm-t" style={{ marginTop: 14, fontSize: "0.9375rem" }}>{tConf("cancel_info")}</p>
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
      <ol className="cdm-steps" aria-label={`${t("paso_fecha")} · ${t("paso_datos")}`}>
        <li className={`cdm-step ${step === 1 ? "is-on" : ""}`} aria-current={step === 1 ? "step" : undefined}>
          <b>1</b>
          <span>{t("paso_fecha")}</span>
        </li>
        <i aria-hidden />
        <li className={`cdm-step ${step === 2 ? "is-on" : ""}`} aria-current={step === 2 ? "step" : undefined}>
          <span>{t("paso_datos")}</span>
          <b>2</b>
        </li>
      </ol>

      {/* ── STEP 1: Disponibilidad ── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Personas */}
          <div>
            <p className="cdm-lab" id="personas-lab" style={{ marginBottom: 10 }}>{t("personas")}</p>
            <div className="cdm-picks" role="group" aria-labelledby="personas-lab">
              {Array.from({ length: limiteGrupo }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" onClick={() => handlePersonas(n)} aria-pressed={personas === n}
                  className={`cdm-pick ${personas === n ? "is-on" : ""}`}>
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => handlePersonas(limiteGrupo + 1)} aria-pressed={personas > limiteGrupo}
                className={`cdm-pick ${personas > limiteGrupo ? "is-on" : ""}`}>
                {limiteGrupo + 1}+
              </button>
            </div>
            {personas > limiteGrupo && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <label htmlFor="personas-grupo">{t("personas_grupo")}</label>
                  <input
                    type="number"
                    min={limiteGrupo + 1}
                    max={50}
                    value={personas}
                    onChange={e => {
                      const v = Math.max(limiteGrupo + 1, Math.min(50, Number(e.target.value) || limiteGrupo + 1));
                      handlePersonas(v);
                    }}
                    id="personas-grupo"
                    className="cdm-num px-2"
                  />
                </div>
                <p className="cdm-note">{t("group_warning", { limite: limiteGrupo })}</p>
              </div>
            )}
          </div>

          {/* Calendar */}
          <div>
            <Calendar
              year={calYear} month={calMonth}
              selectedDate={selectedDate}
              today={today} maxDate={maxDate}
              closedDates={closedDates} locale={locale}
              dayOccupancy={dayOccupancy}
              topePersonas={topePersonas}
              onSelect={handleDateSelect}
              onPrev={prevMonth} onNext={nextMonth}
              prevLabel={t("mes_anterior")} nextLabel={t("mes_siguiente")}
            />
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div ref={timeSlotsRef}>
              <p className="cdm-lab" id="horas-lab" style={{ marginBottom: 10 }}>
                {t("hora_seccion")}
                <span style={{ fontWeight: 400, letterSpacing: "normal", textTransform: "none", marginLeft: 8, fontSize: "0.9375rem", color: "var(--cdm-fg)" }}>
                  {formatDateShort(selectedDate, locale)}
                </span>
              </p>
              {availableSlots.length === 0 ? (
                <p className="cdm-note">{t("no_slots")}</p>
              ) : (
                <div className="cdm-slots" role="group" aria-labelledby="horas-lab">
                  {availableSlots.map((slot) => (
                    <button key={slot} type="button" onClick={() => handleTimeSelect(slot)} aria-pressed={selectedTime === slot}
                      className={`cdm-pick ${selectedTime === slot ? "is-on" : ""}`}>
                      {slot}
                    </button>
                  ))}
                </div>
              )}
              {availableSlots.some((s) => s.startsWith("00:")) && (
                <p className="mt-2 text-sm text-muted-foreground">{t("midnight_note")}</p>
              )}
              {errors.hora && <p className="mt-2 text-xs text-destructive">{errMsg(errors.hora.message)}</p>}
            </div>
          )}

          <Button
            type="button"
            size="lg"
            className="cdm-btn w-full"
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
              className="mt-0.5 cursor-pointer"
              {...register("consentimiento")} />
            <Label htmlFor="consentimiento" className="text-sm font-normal cursor-pointer leading-snug">
              {t("consentimiento")}{" "}
              <Link href={`/${locale}/privacidad`} target="_blank" className="underline underline-offset-4">{t("politica_privacidad")}</Link>
            </Label>
          </div>
          {errors.consentimiento && <p className="text-xs text-destructive">{errMsg(errors.consentimiento.message)}</p>}

          {/* Server error */}
          {serverError && (
            <div className="cdm-err" role="alert">
              <p>{errMsg(serverError) ?? t("errors.generic")}</p>
              {process.env.NODE_ENV !== "production" && dbError && <code>Error: {dbError}</code>}
            </div>
          )}

          {/* Horas alternativas */}
          {serverError === "franja_bloqueada" && alternatives.length > 0 && (
            <div className="cdm-note">
              <p style={{ fontWeight: 700, marginBottom: 10 }}>{t("alternativas")}</p>
              <div className="cdm-picks">
                {alternatives.map((slot) => (
                  <button key={slot} type="button" onClick={() => handleTimeSelect(slot)} aria-pressed={selectedTime === slot}
                    className={`cdm-pick ${selectedTime === slot ? "is-on" : ""}`}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" size="lg" className="cdm-btn w-full" disabled={submitting}>
            {submitting ? t("submitting") : t("submit")}
          </Button>

          <p className="cdm-center">
            <button type="button" onClick={() => setStep(1)} className="cdm-link">
              ← {t("volver")}
            </button>
          </p>
        </div>
      )}
    </form>
  );
}
