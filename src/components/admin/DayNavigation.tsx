"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Home, CalendarDays, Plus } from "lucide-react";
import { addDaysToDate, todayBarcelona } from "@/lib/utils";
import { WalkinModal } from "./WalkinModal";

interface Props {
  currentDate: string;
  totalReservas: number;
  totalPersonas: number;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function formatDisplayDate(fecha: string): string {
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function getMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("es-ES", {
    month: "long", year: "numeric",
  });
}

const DAY_HEADERS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export function DayNavigation({ currentDate, totalReservas, totalPersonas }: Props) {
  const today = todayBarcelona();
  const router = useRouter();
  const isToday = currentDate === today;
  const prevDate = addDaysToDate(currentDate, -1);
  const nextDate = addDaysToDate(currentDate, 1);

  const [showCal, setShowCal] = useState(false);
  const [showWalkin, setShowWalkin] = useState(false);
  const [calYear, setCalYear] = useState(Number(currentDate.split("-")[0]));
  const [calMonth, setCalMonth] = useState(Number(currentDate.split("-")[1]));
  const calRef = useRef<HTMLDivElement>(null);

  const prevHref = prevDate === today ? "/admin" : `/admin/dia/${prevDate}`;
  const nextHref = nextDate === today ? "/admin" : `/admin/dia/${nextDate}`;

  useEffect(() => {
    if (!showCal) return;
    function onClickOutside(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setShowCal(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showCal]);

  function openCal() {
    setCalYear(Number(currentDate.split("-")[0]));
    setCalMonth(Number(currentDate.split("-")[1]));
    setShowCal(true);
  }

  function selectDate(dateStr: string) {
    setShowCal(false);
    router.push(dateStr === today ? "/admin" : `/admin/dia/${dateStr}`);
  }

  function prevCalMonth() {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  }

  function nextCalMonth() {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  }

  const [ty, tm, td] = today.split("-").map(Number);
  const [cy, cm, cd] = currentDate.split("-").map(Number);

  const firstDow = (new Date(calYear, calMonth - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="sticky top-14 z-10 bg-white border-b border-gray-100">
      {/* Date row */}
      <div className="flex items-center justify-between py-4 px-5">
        <Link href={prevHref}>
          <button
            type="button"
            aria-label="Día anterior"
            className="w-11 h-11 rounded-2xl hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors text-gray-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </Link>

        <div className="relative text-center">
          {isToday && (
            <p className="text-[11px] tracking-widest uppercase text-red-500 font-semibold mb-0.5">Hoy</p>
          )}
          <button
            type="button"
            onClick={openCal}
            className="flex items-center gap-1.5 capitalize text-base font-semibold text-gray-900 hover:text-gray-600 transition-colors"
          >
            {formatDisplayDate(currentDate)}
            <CalendarDays className="h-4 w-4 text-gray-400" />
          </button>

          {/* Month calendar dropdown */}
          {showCal && (
            <div
              ref={calRef}
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white shadow-2xl rounded-2xl border-0 ring-1 ring-black/5 p-5 z-50 w-80"
            >
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={prevCalMonth} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold capitalize text-gray-900">
                  {getMonthLabel(calYear, calMonth)}
                </span>
                <button type="button" onClick={nextCalMonth} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-700">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {DAY_HEADERS.map(h => (
                  <div key={h} className="text-center text-xs text-gray-400 font-medium py-1">{h}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-y-0.5">
                {cells.map((day, i) => {
                  if (day === null) return <div key={`e-${i}`} />;
                  const dateStr = `${calYear}-${pad(calMonth)}-${pad(day)}`;
                  const isCurrent = calYear === cy && calMonth === cm && day === cd;
                  const isTodayCell = calYear === ty && calMonth === tm && day === td;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDate(dateStr)}
                      className={[
                        "mx-auto w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-colors",
                        isCurrent
                          ? "bg-gray-900 text-white"
                          : isTodayCell
                          ? "ring-2 ring-gray-900 text-gray-900 hover:bg-gray-100"
                          : "text-gray-700 hover:bg-gray-100",
                      ].join(" ")}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isToday && (
            <Link href="/admin">
              <button
                type="button"
                aria-label="Ir a hoy"
                className="w-11 h-11 rounded-2xl hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors text-gray-700"
              >
                <Home className="h-4 w-4" />
              </button>
            </Link>
          )}
          <Link href={nextHref}>
            <button
              type="button"
              aria-label="Día siguiente"
              className="w-11 h-11 rounded-2xl hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center transition-colors text-gray-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span><span className="text-gray-900 font-semibold">{totalReservas}</span> reservas</span>
          <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
          <span><span className="text-gray-900 font-semibold">{totalPersonas}</span> personas</span>
        </div>
        <button
          type="button"
          onClick={() => setShowWalkin(true)}
          className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-medium flex items-center gap-2 hover:bg-gray-800 active:bg-gray-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Walk-in
        </button>
      </div>

      {showWalkin && (
        <WalkinModal
          defaultDate={currentDate}
          onClose={() => setShowWalkin(false)}
          onCreated={() => {
            setShowWalkin(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
