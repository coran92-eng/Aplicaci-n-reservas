import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://cortedemanga.es";
const locales = ["es", "ca", "en"] as const;
const staticPages = ["", "/privacidad"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) =>
    staticPages.map((page) => ({
      url: `${BASE}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: page === "" ? 1.0 : 0.5,
    }))
  );
}
