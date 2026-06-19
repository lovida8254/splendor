"use client";

import clsx from "clsx";
import { Trophy, Bot, Info } from "lucide-react";
import { useToasts } from "@/store/toastStore";

const ICON = { score: Trophy, ai: Bot, info: Info };

export default function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[70] flex flex-col items-center gap-2 px-2">
      {toasts.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div
            key={t.id}
            className={clsx(
              "gold-frame panel-glass flex max-w-[92vw] items-center gap-2.5 rounded-full px-4 py-2 shadow-velvet animate-fadein",
              t.tone === "score" ? "border-gold" : "",
            )}
          >
            <Icon size={16} className={t.tone === "score" ? "text-gold" : "text-ink-muted"} />
            <div className="leading-tight">
              <span className="text-sm font-bold text-ink">{t.title}</span>
              {t.sub && <span className="ml-2 text-xs text-ink-muted">{t.sub}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
