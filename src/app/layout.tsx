import type { Metadata } from "next";
import { Playfair_Display_SC, Karla } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display_SC({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const karla = Karla({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
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
    statusBarStyle: "default",
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
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${playfair.variable} ${karla.variable}`}>
      <body>{children}</body>
    </html>
  );
}
