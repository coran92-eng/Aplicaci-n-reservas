"use client";

import { useEffect, useState } from "react";
import { getPendingCount } from "@/actions/reservas";

export function PendingBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    getPendingCount()
      .then(setCount)
      .catch(() => {});
  }, []);

  if (count === 0) return null;

  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-black text-[10px] font-bold leading-none ml-1">
      {count > 9 ? "9+" : count}
    </span>
  );
}
