import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corte de Manga · Reservas",
  description: "Reserva tu mesa en Corte de Manga, Barcelona",
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
