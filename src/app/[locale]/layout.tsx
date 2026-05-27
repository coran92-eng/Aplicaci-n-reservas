import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

const locales = ["es", "ca", "en"];
const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://cortedemanga.es";

const META: Record<string, { title: string; description: string }> = {
  es: {
    title: "Corte de Manga — Reserva tu mesa en Barcelona",
    description: "Reserva tu mesa en Corte de Manga, Comte d'Urgell 108, Barcelona. Cocina creativa en el corazón del Eixample.",
  },
  ca: {
    title: "Corte de Manga — Reserva la teva taula a Barcelona",
    description: "Reserva la teva taula a Corte de Manga, Comte d'Urgell 108, Barcelona. Cuina creativa al cor de l'Eixample.",
  },
  en: {
    title: "Corte de Manga — Book a table in Barcelona",
    description: "Book a table at Corte de Manga, Comte d'Urgell 108, Barcelona. Creative cuisine in the heart of Eixample.",
  },
};

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const meta = META[locale] ?? META.es;
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `${BASE}/${locale}`,
      languages: {
        es: `${BASE}/es`,
        ca: `${BASE}/ca`,
        en: `${BASE}/en`,
        "x-default": `${BASE}/es`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE}/${locale}`,
      siteName: "Corte de Manga",
      locale: locale === "ca" ? "ca_ES" : locale === "en" ? "en_GB" : "es_ES",
      type: "website",
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "Corte de Manga",
  url: BASE,
  telephone: process.env.RESTAURANT_PHONE ?? "+34 623 216 562",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Comte d'Urgell 108",
    addressLocality: "Barcelona",
    postalCode: "08011",
    addressCountry: "ES",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 41.3849,
    longitude: 2.1535,
  },
  servesCuisine: "Spanish, Creative",
  priceRange: "€€",
  hasMap: process.env.RESTAURANT_GOOGLE_MAPS_URL ?? "https://maps.google.com",
  acceptsReservations: true,
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
        {children}
      </NextIntlClientProvider>
    </>
  );
}
