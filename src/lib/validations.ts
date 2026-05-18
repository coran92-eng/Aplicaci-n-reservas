import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

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

export const reservaSchema = z.object({
  nombre: z
    .string()
    .min(2, "nombre_min")
    .max(50, "nombre_max")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "nombre_min"),
  apellido: z
    .string()
    .min(2, "apellido_min")
    .max(50, "apellido_max")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "apellido_min"),
  telefono: z.string().refine(
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
  personas: z.number().min(1, "personas_min").max(50, "personas_max"),
  notas_cliente: z.string().max(300, "notas_max").optional().or(z.literal("")),
  consentimiento: z.boolean().refine((v) => v === true, "consentimiento_required"),
  idioma: z.enum(["es", "ca", "en"]).default("es"),
  website: z.string().max(0).optional(), // honeypot
});

export type ReservaInput = z.infer<typeof reservaSchema>;
