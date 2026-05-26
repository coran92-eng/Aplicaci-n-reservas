import type { Metadata } from "next";
import Link from "next/link";
import { Settings, LogOut, Search, Clock } from "lucide-react";
import { logoutAdmin } from "@/actions/admin";
import { PendingBadge } from "@/components/admin/PendingBadge";
import { PushNotificationToggle } from "@/components/admin/PushNotificationToggle";
import { ServiceWorkerRegistrar } from "@/components/admin/ServiceWorkerRegistrar";

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
    <div className="admin-theme min-h-screen bg-white text-gray-900">
      <ServiceWorkerRegistrar />
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white text-xs">
        <span className="font-semibold">Corte de Manga · Admin</span>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pendientes"
            className="flex items-center gap-1 opacity-70 hover:opacity-100"
          >
            <Clock className="h-3.5 w-3.5" />
            Pendientes
            <PendingBadge />
          </Link>
          <Link
            href="/admin/buscar"
            className="flex items-center gap-1 opacity-70 hover:opacity-100"
          >
            <Search className="h-3.5 w-3.5" />
            Buscar
          </Link>
          <Link
            href="/admin/ajustes"
            className="flex items-center gap-1 opacity-70 hover:opacity-100"
          >
            <Settings className="h-3.5 w-3.5" />
            Ajustes
          </Link>
          <PushNotificationToggle />
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
      <div className="min-h-[calc(100vh-32px)]">{children}</div>
    </div>
  );
}
