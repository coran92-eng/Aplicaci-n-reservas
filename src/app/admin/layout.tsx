import type { Metadata } from "next";
import Link from "next/link";
import { Settings, LogOut } from "lucide-react";
import { logoutAdmin } from "@/actions/admin";

export const metadata: Metadata = {
  title: "Admin · Corte de Manga",
  manifest: "/manifest-admin.json",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-theme min-h-screen bg-background">
      <div className="flex items-center justify-between px-4 py-2 bg-black text-white text-xs">
        <span className="font-semibold">Corte de Manga · Admin</span>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/ajustes"
            className="flex items-center gap-1 opacity-70 hover:opacity-100"
          >
            <Settings className="h-3.5 w-3.5" />
            Ajustes
          </Link>
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="flex items-center gap-1 opacity-70 hover:opacity-100"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </button>
          </form>
        </div>
      </div>
      <div className="bg-white min-h-[calc(100vh-32px)]">{children}</div>
    </div>
  );
}
