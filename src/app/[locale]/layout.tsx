import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { APP_URL } from "@/lib/app-url";
import { RESTAURANT_PHONE, SITE } from "@/lib/site";
import "@/styles/cdm.css";

const locales = ["es", "ca", "en"];

// La letra de la carta y de cortedemanga.es (Atkinson Hyperlegible Next, licencia SIL OFL 1.1: src/fonts/OFL.txt)
const cdm = localFont({
  src: [
    { path: "../../fonts/cdm-400.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/cdm-500.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/cdm-700.woff2", weight: "700", style: "normal" },
    { path: "../../fonts/cdm-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-cdm",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

// Mismo tono que la web: bar de tapas y vermut (sin hablar de cocina)
const META: Record<string, { title: string; description: string }> = {
  es: {
    title: "Reservar mesa · Corte de Manga, Eixample (Barcelona)",
    description:
      "Reserva mesa online en Corte de Manga, bar de tapas y vermut en la calle Comte d’Urgell, 108 (Eixample, Barcelona).",
  },
  ca: {
    title: "Reserva taula · Corte de Manga, Eixample (Barcelona)",
    description:
      "Reserva taula en línia a Corte de Manga, bar de tapes i vermut al carrer del Comte d’Urgell, 108 (Eixample, Barcelona).",
  },
  en: {
    title: "Book a table · Corte de Manga, Eixample (Barcelona)",
    description:
      "Book a table online at Corte de Manga, a tapas and vermouth bar at Carrer del Comte d’Urgell 108, in Barcelona’s Eixample.",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E3A2B",
};

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const meta = META[locale] ?? META.es;
  // Las URLs son las de la app de reservas, no las de cortedemanga.es (allí vive la web).
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `${APP_URL}/${locale}`,
      languages: {
        ca: `${APP_URL}/ca`,
        es: `${APP_URL}/es`,
        en: `${APP_URL}/en`,
        "x-default": `${APP_URL}/es`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${APP_URL}/${locale}`,
      siteName: "Corte de Manga",
      locale: locale === "ca" ? "ca_ES" : locale === "en" ? "en_GB" : "es_ES",
      type: "website",
    },
  };
}

// El mismo restaurante que describe cortedemanga.es (mismo @id y mismos datos)
const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["Restaurant", "BarOrPub"],
  "@id": "https://cortedemanga.es/#restaurant",
  name: "Corte de Manga",
  url: SITE.web,
  telephone: RESTAURANT_PHONE,
  email: SITE.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Carrer del Comte d'Urgell, 108",
    addressLocality: "Barcelona",
    postalCode: "08011",
    addressRegion: "Catalunya",
    addressCountry: "ES",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 41.3839974,
    longitude: 2.1565477,
  },
  hasMap: SITE.maps,
  servesCuisine: ["Catalan", "Mediterranean", "Tapas"],
  priceRange: "€€",
  acceptsReservations: `${APP_URL}/`,
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale)) notFound();

  const messages = await getMessages();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NextIntlClientProvider messages={messages}>
        <div className={`cdm-public ${cdm.className} ${cdm.variable}`}>{children}</div>
      </NextIntlClientProvider>
    </>
  );
}
