import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/app-url";

// Solo URLs de esta app (reservas.cortedemanga.es); las de la web van en el sitemap de cortedemanga.es
const locales = ["ca", "es", "en"] as const;
const staticPages = ["", "/privacidad"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) =>
    staticPages.map((page) => ({
      url: `${APP_URL}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: page === "" ? 1.0 : 0.5,
    }))
  );
}
