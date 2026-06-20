"use client";

import clsx from "clsx";
import { Crown } from "lucide-react";
import { eligibleNobles, GEM_COLORS, Noble } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { Pip } from "./gems";
import { ImageBg } from "./CardArt";
import { NOBLE_BG, NOBLE_IMAGE_FILES } from "@/lib/assets";

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
      {/* shared backdrop image (if provided) */}
      {NOBLE_BG && (
        <>
          <ImageBg src={`nobles/${NOBLE_BG}`} />
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-black/45" />
        </>
      )}

      {/* crest */}
      <div className="relative z-10 mb-1.5 flex items-center justify-between">
        <span className="font-display text-lg font-bold leading-none text-gold drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">3</span>
        <Crown size={14} className="text-gold/90" />
      </div>
      <div
        className="relative z-10 mx-auto mb-1.5 grid h-9 w-9 place-items-center overflow-hidden rounded-full font-display text-lg font-bold text-gold ring-1 ring-gold/40"
        style={{ background: "radial-gradient(circle at 35% 30%, #4a4070, #221b38)" }}
        title={noble.name ?? noble.id}
      >
        {NOBLE_IMAGE_FILES[noble.id] ? (
          <ImageBg src={`nobles/${NOBLE_IMAGE_FILES[noble.id]}`} fallback={initial(noble)} />
        ) : (
          initial(noble)
        )}
      </div>
      <div className="relative z-10 flex flex-wrap justify-center gap-1">
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
