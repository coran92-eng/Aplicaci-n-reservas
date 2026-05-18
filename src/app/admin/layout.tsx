import type { Metadata } from "next";
import Link from "next/link";
import { Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin · Corte de Manga",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center justify-between px-4 py-2 bg-black text-white text-xs">
        <span className="font-semibold">Corte de Manga · Admin</span>
        <Link href="/admin/ajustes" className="flex items-center gap-1 opacity-70 hover:opacity-100">
          <Settings className="h-3.5 w-3.5" />
          Ajustes
        </Link>
      </div>
      <div className="bg-white min-h-[calc(100vh-32px)]">{children}</div>
    </div>
  );
}
