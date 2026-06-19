"use client";

import clsx from "clsx";
import { Crown } from "lucide-react";
import { eligibleNobles, GEM_COLORS, Noble } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { Pip } from "./gems";

function initial(noble: Noble): string {
  const n = (noble.name ?? noble.id).trim();
  return n ? n[0].toUpperCase() : "♛";
}

export function NobleTile({ noble, eligible, size = "md" }: { noble: Noble; eligible?: boolean; size?: "sm" | "md" }) {
  const w = size === "sm" ? "w-[72px]" : "w-[100px]";
  return (
    <div
      className={clsx(
        "relative rounded-xl p-2 transition gold-frame",
        w,
        eligible ? "animate-affordable" : "",
      )}
      style={{ background: "linear-gradient(160deg, #322a4e, #1f1932)" }}
    >
      {/* crest */}
      <div className="relative mb-1.5 flex items-center justify-between">
        <span className="font-display text-lg font-bold leading-none text-gold">3</span>
        <Crown size={14} className="text-gold/80" />
      </div>
      <div
        className="mx-auto mb-1.5 grid h-9 w-9 place-items-center rounded-full font-display text-lg font-bold text-gold ring-1 ring-gold/40"
        style={{ background: "radial-gradient(circle at 35% 30%, #4a4070, #221b38)" }}
        title={noble.name ?? noble.id}
      >
        {initial(noble)}
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {GEM_COLORS.filter((c) => noble.requirement[c] > 0).map((c) => (
          <Pip key={c} color={c} n={noble.requirement[c]} />
        ))}
      </div>
    </div>
  );
}

export default function NobleRow() {
  const game = useGame((s) => s.game)!;
  const replayActive = useGame((s) => s.replayActive);
  const me = game.players[game.currentPlayerIndex];
  const eligibleIds = new Set(
    me && !me.isAI && !replayActive ? eligibleNobles(me, game.nobles).map((n) => n.id) : [],
  );

  if (game.nobles.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
      {game.nobles.map((n) => (
        <NobleTile key={n.id} noble={n} eligible={eligibleIds.has(n.id)} />
      ))}
    </div>
  );
}
