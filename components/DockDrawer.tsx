"use client";

import { useState } from "react";
import clsx from "clsx";
import { Wallet, X } from "lucide-react";
import PlayerDock from "./PlayerDock";

/** The current player's holdings dock, hidden in a right slide-out drawer. */
export default function DockDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* edge toggle (left) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="내 보유 보기"
          className="gold-frame panel-glass fixed left-0 top-1/2 z-[55] flex -translate-y-1/2 flex-col items-center gap-1 rounded-r-xl px-2 py-3 text-gold transition hover:brightness-110"
        >
          <Wallet size={18} />
          <span className="text-[11px] font-semibold [writing-mode:vertical-rl]">내 보유</span>
        </button>
      )}

      {/* backdrop */}
      {open && <div className="fixed inset-0 z-[60] bg-black/45 animate-fadein" onClick={() => setOpen(false)} />}

      {/* drawer (slides in from the left) */}
      <div
        className={clsx(
          "fixed left-0 top-0 z-[65] h-full w-[400px] max-w-[94vw] overflow-y-auto thin-scroll p-3 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-display text-sm font-bold text-gold">
            <Wallet size={15} /> 내 보유
          </span>
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line2 bg-panel text-ink-muted hover:bg-panel-2"
          >
            <X size={16} />
          </button>
        </div>
        <PlayerDock />
      </div>
    </>
  );
}
