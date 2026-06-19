"use client";

import clsx from "clsx";
import { Crown } from "lucide-react";
import { eligibleNobles, GEM_COLORS, Noble } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { Pip } from "./gems";

export function NobleTile({ noble, eligible }: { noble: Noble; eligible?: boolean }) {
  return (
    <div
      className={clsx(
        "relative w-[96px] rounded-xl border bg-gradient-to-br from-[#2e2748] to-[#211b34] p-2.5 shadow-velvet transition",
        eligible ? "border-gold shadow-[0_0_0_1px_#d8b25e,0_0_18px_rgba(216,178,94,.35)]" : "border-line2",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-xl font-bold leading-none text-gold">3</span>
        <Crown size={15} className="text-gold/80" />
      </div>
      <div className="my-1.5 h-7 overflow-hidden text-[9.5px] leading-tight text-ink-muted">
        {noble.name ?? noble.id}
      </div>
      <div className="flex flex-wrap gap-1">
        {GEM_COLORS.filter((c) => noble.requirement[c] > 0).map((c) => (
          <Pip key={c} color={c} n={noble.requirement[c]} />
        ))}
      </div>
    </div>
  );
}

export default function NobleRow() {
  const game = useGame((s) => s.game)!;
  const me = game.players[game.currentPlayerIndex];
  const eligibleIds = new Set(
    me && !me.isAI ? eligibleNobles(me, game.nobles).map((n) => n.id) : [],
  );

  if (game.nobles.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2.5">
      {game.nobles.map((n) => (
        <NobleTile key={n.id} noble={n} eligible={eligibleIds.has(n.id)} />
      ))}
    </div>
  );
}
