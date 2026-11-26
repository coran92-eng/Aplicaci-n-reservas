import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

// Máximo de personas que se pueden pedir por internet (los grupos de más de limite_grupo_online quedan pendientes de aprobar)
export const MAX_PERSONAS_ONLINE = 40;

const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "spam4.me",
  "trashmail.com",
  "dispostable.com",
  "mailnull.com",
  "spamgourmet.com",
  "fakeinbox.com",
  "maildrop.cc",
  "mintemail.com",
  "discard.email",
  "spamgourmet.net",
  "spamgourmet.org",
];

// Letras de cualquier alfabeto (turistas: Łukasz, Nguyễn, Ōtani…), espacios, apóstrofos, punto y guion
const NAME_RE = /^[\p{L}\p{M}\s'’.-]+$/u;

export const reservaSchema = z.object({
  nombre: z
    .string()
    .min(2, "nombre_min")
    .max(50, "nombre_max")
    .regex(NAME_RE, "nombre_min"),
  apellido: z
    .string()
    .min(2, "apellido_min")
    .max(50, "apellido_max")
    .regex(NAME_RE, "apellido_min"),
  telefono: z.string({ required_error: "telefono_invalid" }).refine(
    (val) => {
      try {
        return isValidPhoneNumber(val);
      } catch {
        return false;
      }
    },
    { message: "telefono_invalid" }
  ),
  email: z
    .string()
    .email("email_invalid")
    .refine((val) => {
      const domain = val.split("@")[1]?.toLowerCase();
      return !DISPOSABLE_DOMAINS.includes(domain);
    }, "email_disposable"),
  fecha: z.string().min(1, "fecha_required"),
  hora: z.string().min(1, "hora_required"),
  personas: z.number().int().min(1, "personas_min").max(MAX_PERSONAS_ONLINE, "personas_max"),
  notas_cliente: z.string().max(300, "notas_max").optional().or(z.literal("")),
  alergias: z.array(z.string()).optional().default([]),
  consentimiento: z.boolean().refine((v) => v === true, "consentimiento_required"),
  idioma: z.enum(["es", "ca", "en"]).default("es"),
  // de dónde llega la reserva (?src= del enlace); si no cumple el formato, se ignora en el servidor
  origen: z.string().max(32).optional().or(z.literal("")),
  website: z.string().max(0).optional(), // honeypot
});

export type ReservaInput = z.infer<typeof reservaSchema>;
