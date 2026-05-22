import type { Metadata } from "next";
import "./globals.css";

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
    <html>
      <body>{children}</body>
    </html>
  );
}
