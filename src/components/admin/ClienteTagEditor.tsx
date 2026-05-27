"use client";

import { useState } from "react";
import { updateClienteTags } from "@/actions/crm";

const PREDEFINED_TAGS: {
  value: string;
  label: string;
  activeClass: string;
}[] = [
  { value: "vip", label: "VIP", activeClass: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "business", label: "Business", activeClass: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "prensa", label: "Prensa", activeClass: "bg-purple-100 text-purple-800 border-purple-300" },
  { value: "habitual", label: "Habitual", activeClass: "bg-green-100 text-green-800 border-green-300" },
  { value: "cumpleanos", label: "Cumpleaños", activeClass: "bg-pink-100 text-pink-800 border-pink-300" },
];

interface Props {
  clienteId: string;
  initialTags: string[];
}

export function ClienteTagEditor({ clienteId, initialTags }: Props) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [pending, setPending] = useState<string | null>(null);

  async function toggleTag(value: string) {
    const next = tags.includes(value)
      ? tags.filter((t) => t !== value)
      : [...tags, value];
    setTags(next);
    setPending(value);
    await updateClienteTags(clienteId, next);
    setPending(null);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {PREDEFINED_TAGS.map((tag) => {
        const isActive = tags.includes(tag.value);
        return (
          <button
            key={tag.value}
            onClick={() => toggleTag(tag.value)}
            disabled={pending === tag.value}
            className={[
              "px-3 py-1 rounded-full text-xs font-medium border transition-all",
              isActive
                ? tag.activeClass
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700",
              pending === tag.value ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}
