"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDaysToDate, todayBarcelona } from "@/lib/utils";

interface Props {
  currentDate: string;
  totalReservas: number;
  totalPersonas: number;
}

function formatDisplayDate(fecha: string): string {
  const [year, month, day] = fecha.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function DayNavigation({ currentDate, totalReservas, totalPersonas }: Props) {
  const today = todayBarcelona();
  const isToday = currentDate === today;
  const prevDate = addDaysToDate(currentDate, -1);
  const nextDate = addDaysToDate(currentDate, 1);

  const prevHref =
    prevDate === today ? "/admin" : `/admin/dia/${prevDate}`;
  const nextHref =
    nextDate === today ? "/admin" : `/admin/dia/${nextDate}`;

  return (
    <div className="sticky top-0 z-10 bg-background border-b">
      {/* Date row */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={prevHref}>
          <Button variant="ghost" size="icon" className="admin-btn" aria-label="Día anterior">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>

        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {isToday ? "Hoy" : ""}
          </p>
          <p className="font-semibold capitalize text-sm">
            {formatDisplayDate(currentDate)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {!isToday && (
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="admin-btn" aria-label="Ir a hoy">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <Link href={nextHref}>
            <Button variant="ghost" size="icon" className="admin-btn" aria-label="Día siguiente">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-center gap-4 px-4 pb-3 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{totalReservas}</strong> reservas
        </span>
        <span>·</span>
        <span>
          <strong className="text-foreground">{totalPersonas}</strong> personas
        </span>
      </div>
    </div>
  );
}
