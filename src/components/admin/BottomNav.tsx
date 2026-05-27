"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock, Map, Search, Settings } from "lucide-react";
import { PendingBadge } from "./PendingBadge";
import { cn } from "@/lib/utils";

const tabs = [
  {
    label: "Hoy",
    href: "/admin",
    icon: CalendarDays,
  },
  {
    label: "Pendientes",
    href: "/admin/pendientes",
    icon: Clock,
    badge: true,
  },
  {
    label: "Mapa",
    href: "/admin/mapa",
    icon: Map,
  },
  {
    label: "Buscar",
    href: "/admin/buscar",
    icon: Search,
  },
  {
    label: "Ajustes",
    href: "/admin/ajustes",
    icon: Settings,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/admin") {
      return pathname === "/admin" || pathname.startsWith("/admin/dia");
    }
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex shadow-[0_-1px_0_0_#f3f4f6]">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 flex flex-col items-center py-3.5 relative transition-colors",
              active ? "text-gray-900" : "text-gray-400"
            )}
          >
            {/* Active indicator bar at bottom */}
            {active && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gray-900 rounded-full" />
            )}

            {/* Icon wrapper — relative so badge can be absolutely positioned */}
            <span className="relative">
              <Icon
                className={cn(
                  "h-6 w-6",
                  active ? "stroke-[2.5]" : "stroke-2"
                )}
              />
              {tab.badge && (
                <span className="absolute -top-1 left-full -ml-1">
                  <PendingBadge />
                </span>
              )}
            </span>

            <span className="text-[11px] mt-0.5 leading-none">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
