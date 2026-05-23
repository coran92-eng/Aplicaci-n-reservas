import type { Metadata } from "next";
import { Syne, Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Corte de Manga · Reservas",
  description: "Reserva tu mesa en Corte de Manga, Comte d'Urgell 108, Barcelona.",
  openGraph: {
    title: "Corte de Manga · Reservas",
    description: "Reserva tu mesa en Corte de Manga, Barcelona.",
    type: "website",
    locale: "es_ES",
    siteName: "Corte de Manga",
  },
  twitter: {
    card: "summary",
    title: "Corte de Manga · Reservas",
    description: "Reserva tu mesa en Corte de Manga, Barcelona.",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Corte de Manga",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#050505",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let lang = "es";
  try { lang = await getLocale(); } catch {}
  return (
    <html lang={lang} className={`${syne.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
