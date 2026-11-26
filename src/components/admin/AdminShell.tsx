"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, LogOut } from "lucide-react";
import { logoutAdmin } from "@/actions/admin";
import { PushNotificationToggle } from "@/components/admin/PushNotificationToggle";
import { ServiceWorkerRegistrar } from "@/components/admin/ServiceWorkerRegistrar";
import { BottomNav } from "@/components/admin/BottomNav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // El login no lleva barra superior/inferior: sin sesión esos componentes
  // llaman a acciones protegidas y provocaban recargas en bucle.
  if (pathname === "/admin/login") {
    return <div className="min-h-screen bg-gray-50 text-gray-900">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <ServiceWorkerRegistrar />

      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-5">
        <span className="text-sm font-semibold text-gray-900">
          Corte de Manga{" "}
          <span className="text-red-500">·</span>{" "}
          <span className="font-normal text-gray-400">Admin</span>
        </span>

        <div className="flex items-center gap-3">
          {/* Calculadora de menús de grupo: siempre a mano, en todas las pantallas del panel */}
          <Link
            href="/admin/grupos"
            aria-current={pathname.startsWith("/admin/grupos") ? "page" : undefined}
            className={
              pathname.startsWith("/admin/grupos")
                ? "inline-flex h-11 items-center gap-1.5 rounded-full bg-gray-900 px-3 text-sm font-medium text-white"
                : "inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-gray-600 hover:text-gray-900"
            }
          >
            <Calculator className="h-5 w-5" />
            Grupos
          </Link>
          <PushNotificationToggle />
          <form action={logoutAdmin}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              className="flex items-center justify-center w-11 h-11 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <div className="pt-14 min-h-[calc(100vh-56px-64px)] pb-20">{children}</div>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
