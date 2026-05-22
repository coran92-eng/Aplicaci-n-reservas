"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function AdminLogout() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
      title="Cerrar sesión"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>Salir</span>
    </button>
  );
}
