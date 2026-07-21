import { parsePhoneNumberFromString } from "libphonenumber-js";

// Nombres de país en español a partir del código ISO (built-in, sin dependencias)
const regionNames = new Intl.DisplayNames(["es"], { type: "region" });

export interface PhoneCountry {
  code: string; // ISO 3166-1 alpha-2, p. ej. "ES"
  name: string; // "España", "Francia", ...
  flag: string; // 🇪🇸, 🇫🇷, ...
}

/**
 * Deriva el país de un número de teléfono en formato internacional (E.164).
 * Devuelve null si el número no es parseable o no lleva prefijo de país.
 */
export function countryFromPhone(
  telefono: string | null | undefined
): PhoneCountry | null {
  if (!telefono) return null;
  try {
    const parsed = parsePhoneNumberFromString(telefono);
    const code = parsed?.country;
    if (!code) return null;
    const name = regionNames.of(code) ?? code;
    const flag = code.replace(/./g, (c) =>
      String.fromCodePoint(127397 + c.charCodeAt(0))
    );
    return { code, name, flag };
  } catch {
    return null;
  }
}
