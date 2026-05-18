"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reservaSchema, type ReservaInput } from "@/lib/validations";
import { createReserva } from "@/actions/reservas";
import {
  generateTimeSlots,
  todayBarcelona,
  addDaysToDate,
  nowBarcelona,
} from "@/lib/utils";
import type { FranjaBloqueada, DiaCerrado } from "@/lib/supabase/types";
import Link from "next/link";

interface Props {
  franjasBloqueadas: FranjaBloqueada[];
  diasCerrados: DiaCerrado[];
  limiteGrupo: number;
  antelacionMax: number;
}

export function ReservationForm({
  franjasBloqueadas,
  diasCerrados,
  limiteGrupo,
  antelacionMax,
}: Props) {
  const t = useTranslations("form");
  const locale = useLocale();
  const router = useRouter();

  const today = todayBarcelona();
  const maxDate = addDaysToDate(today, antelacionMax);

  const closedDates = new Set(diasCerrados.map((d) => d.fecha));

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReservaInput>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      idioma: locale as "es" | "ca" | "en",
      personas: 2,
      consentimiento: false,
    },
  });

  const selectedDate = watch("fecha");
  const selectedPersonas = watch("personas");
  const [serverError, setServerError] = useState<string | null>(null);
  const [phoneValue, setPhoneValue] = useState("");

  const allSlots = generateTimeSlots();

  const availableSlots = (() => {
    if (!selectedDate) return allSlots;

    const blockedForDate = new Set(
      franjasBloqueadas
        .filter((f) => f.fecha === selectedDate)
        .map((f) => f.hora.slice(0, 5))
    );

    const nowMins = (() => {
      if (selectedDate !== today) return -1;
      const now = nowBarcelona();
      return now.getHours() * 60 + now.getMinutes();
    })();

    return allSlots.filter((slot) => {
      if (blockedForDate.has(slot)) return false;
      if (nowMins >= 0) {
        const [hh, mm] = slot.split(":").map(Number);
        // midnight slots (00:xx) are treated as next day — always available
        if (hh === 0) return true;
        const slotMins = hh * 60 + mm;
        if (slotMins - nowMins < 15) return false;
      }
      return true;
    });
  })();

  const isClosed = selectedDate ? closedDates.has(selectedDate) : false;

  async function onSubmit(data: ReservaInput) {
    setServerError(null);
    const result = await createReserva(data);

    if (!result.ok) {
      setServerError(result.error);
      return;
    }

    if (result.estado === "pendiente_aprobacion") {
      router.push(`/${locale}/solicitud-recibida/${result.id}`);
    } else {
      router.push(`/${locale}/confirmada/${result.id}`);
    }
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setPhoneValue(val);
    // Try to parse and normalize
    try {
      const parsed = parsePhoneNumberFromString(val, "ES");
      setValue("telefono", parsed?.format("E.164") ?? val, {
        shouldValidate: false,
      });
    } catch {
      setValue("telefono", val, { shouldValidate: false });
    }
  }

  const showGroupWarning =
    selectedPersonas !== undefined && selectedPersonas > limiteGrupo;

  function getErrorMessage(errorKey: string | undefined): string | null {
    if (!errorKey) return null;
    try {
      return t(`errors.${errorKey}` as Parameters<typeof t>[0]);
    } catch {
      return t("errors.generic");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Honeypot — hidden from real users */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }} aria-hidden>
        <input
          type="text"
          {...register("website")}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Nombre + Apellido */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nombre">{t("nombre")} *</Label>
          <Input
            id="nombre"
            autoComplete="given-name"
            {...register("nombre")}
            aria-invalid={!!errors.nombre}
          />
          {errors.nombre && (
            <p className="text-xs text-destructive">
              {getErrorMessage(errors.nombre.message)}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="apellido">{t("apellido")} *</Label>
          <Input
            id="apellido"
            autoComplete="family-name"
            {...register("apellido")}
            aria-invalid={!!errors.apellido}
          />
          {errors.apellido && (
            <p className="text-xs text-destructive">
              {getErrorMessage(errors.apellido.message)}
            </p>
          )}
        </div>
      </div>

      {/* Teléfono */}
      <div className="space-y-1.5">
        <Label htmlFor="telefono">{t("telefono")} *</Label>
        <Input
          id="telefono"
          type="tel"
          autoComplete="tel"
          placeholder="+34 600 000 000"
          value={phoneValue}
          onChange={handlePhoneChange}
          aria-invalid={!!errors.telefono}
        />
        <input type="hidden" {...register("telefono")} />
        {errors.telefono && (
          <p className="text-xs text-destructive">
            {getErrorMessage(errors.telefono.message)}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")} *</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-xs text-destructive">
            {getErrorMessage(errors.email.message)}
          </p>
        )}
      </div>

      {/* Fecha + Hora */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fecha">{t("fecha")} *</Label>
          <Input
            id="fecha"
            type="date"
            min={today}
            max={maxDate}
            {...register("fecha")}
            aria-invalid={!!errors.fecha}
            onChange={(e) => {
              register("fecha").onChange(e);
              setValue("hora", ""); // reset hora when date changes
            }}
          />
          {errors.fecha && (
            <p className="text-xs text-destructive">
              {getErrorMessage(errors.fecha.message)}
            </p>
          )}
          {isClosed && (
            <p className="text-xs text-destructive">{t("errors.dia_cerrado")}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hora">{t("hora")} *</Label>
          <Select
            disabled={!selectedDate || isClosed}
            onValueChange={(val) => setValue("hora", val, { shouldValidate: true })}
          >
            <SelectTrigger id="hora" aria-invalid={!!errors.hora}>
              <SelectValue
                placeholder={
                  !selectedDate
                    ? t("select_date_first")
                    : availableSlots.length === 0
                    ? t("no_slots")
                    : t("hora")
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableSlots.map((slot) => (
                <SelectItem key={slot} value={slot}>
                  {slot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" {...register("hora")} />
          {errors.hora && (
            <p className="text-xs text-destructive">
              {getErrorMessage(errors.hora.message)}
            </p>
          )}
          {selectedDate && (
            <p className="text-xs text-muted-foreground">{t("midnight_note")}</p>
          )}
        </div>
      </div>

      {/* Personas */}
      <div className="space-y-1.5">
        <Label htmlFor="personas">{t("personas")} *</Label>
        <Select
          defaultValue="2"
          onValueChange={(val) =>
            setValue("personas", parseInt(val), { shouldValidate: true })
          }
        >
          <SelectTrigger id="personas">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" {...register("personas", { valueAsNumber: true })} />
        {showGroupWarning && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              {t("group_warning", { limite: limiteGrupo })}
            </p>
          </div>
        )}
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <Label htmlFor="notas">{t("notas")}</Label>
        <Textarea
          id="notas"
          placeholder={t("notas_placeholder")}
          rows={3}
          {...register("notas_cliente")}
          aria-invalid={!!errors.notas_cliente}
        />
        {errors.notas_cliente && (
          <p className="text-xs text-destructive">
            {getErrorMessage(errors.notas_cliente.message)}
          </p>
        )}
      </div>

      {/* Consentimiento */}
      <div className="flex items-start gap-3">
        <input
          id="consentimiento"
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-black cursor-pointer"
          {...register("consentimiento")}
        />
        <Label htmlFor="consentimiento" className="text-sm font-normal cursor-pointer">
          {t("consentimiento")}{" "}
          <Link
            href={`/${locale}/privacidad`}
            target="_blank"
            className="underline"
          >
            {t("politica_privacidad")}
          </Link>
        </Label>
      </div>
      {errors.consentimiento && (
        <p className="text-xs text-destructive">
          {getErrorMessage(errors.consentimiento.message)}
        </p>
      )}

      {/* Server error */}
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">
            {getErrorMessage(serverError) ?? t("errors.generic")}
          </p>
        </div>
      )}

      {/* Idioma hidden */}
      <input type="hidden" {...register("idioma")} value={locale} />

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting || isClosed}
      >
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
