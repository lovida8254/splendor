"use client";

import clsx from "clsx";
import { Bot, User, Crown, BookMarked } from "lucide-react";
import { GEM_COLORS, Player } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { GEM_META, GemToken, Pip } from "./gems";
import DevCard from "./DevCard";

export function PlayerSummary({ player, index }: { player: Player; index: number }) {
  const game = useGame((s) => s.game)!;
  const isCurrent = game.currentPlayerIndex === index;
  const tokenTotal = GEM_COLORS.reduce((s, c) => s + player.tokens[c], 0) + player.tokens.gold;

  return (
    <div
      className={clsx(
        "rounded-xl border bg-panel/60 p-2.5 transition",
        isCurrent ? "border-gold/70 shadow-[0_0_0_1px_rgba(216,178,94,.4)]" : "border-line",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {player.isAI ? <Bot size={14} className="text-ink-muted" /> : <User size={14} className="text-gold" />}
          <span className="max-w-[90px] truncate text-sm font-semibold text-ink">{player.name}</span>
        </div>
        <span className="flex items-center gap-1 font-display text-lg font-bold text-gold">
          <Crown size={13} /> {player.prestige}
        </span>
      </div>

      {/* bonuses (card engine) */}
      <div className="mb-1 flex flex-wrap gap-1">
        {GEM_COLORS.map((c) => (
          <span
            key={c}
            title={`${GEM_META[c].label} 보너스 ${player.bonuses[c]}`}
            className="flex items-center gap-0.5 text-[10px] text-ink-muted"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/40"
              style={{ background: GEM_META[c].hex }}
            />
            {player.bonuses[c]}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] text-ink-muted2">
        <span>토큰 {tokenTotal}/10</span>
        <span className="flex items-center gap-1">
          <BookMarked size={11} /> {player.reserved.length}
        </span>
      </div>
    </div>
  );
}

export function CurrentDock() {
  const game = useGame((s) => s.game)!;
  const player = game.players[game.currentPlayerIndex];
  const tokenTotal = GEM_COLORS.reduce((s, c) => s + player.tokens[c], 0) + player.tokens.gold;

  return (
    <div className="rounded-xl border border-line bg-velvet-2/70 p-3 shadow-velvet">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {player.isAI ? <Bot size={16} className="text-ink-muted" /> : <User size={16} className="text-gold" />}
          <span className="font-semibold text-ink">{player.name}</span>
          {player.isAI && <span className="text-[10px] text-ink-muted2">({player.aiLevel})</span>}
        </div>
        <span className="flex items-center gap-1 font-display text-xl font-bold text-gold">
          <Crown size={15} /> {player.prestige}
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-x-5 gap-y-2">
        {/* tokens */}
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-muted2">
            토큰 {tokenTotal}/10
          </div>
          <div className="flex gap-1.5">
            {(["white", "blue", "green", "red", "black", "gold"] as const).map((c) => (
              <GemToken key={c} color={c} count={player.tokens[c]} size="sm" />
            ))}
          </div>
        </div>

        {/* bonuses */}
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-muted2">카드 보너스</div>
          <div className="flex gap-1.5">
            {GEM_COLORS.map((c) => (
              <Pip key={c} color={c} n={player.bonuses[c]} size="md" />
            ))}
          </div>
        </div>

        {/* nobles */}
        {player.nobles.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-muted2">귀족</div>
            <div className="flex items-center gap-1 font-display text-lg font-bold text-gold">
              <Crown size={15} /> ×{player.nobles.length}
            </div>
          </div>
        )}
      </div>

      {/* reserved cards */}
      {player.reserved.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-ink-muted2">
            <BookMarked size={11} /> 예약 카드 ({player.reserved.length}/3)
          </div>
          {player.isAI ? (
            <div className="flex gap-2">
              {player.reserved.map((c) => (
                <div
                  key={c.id}
                  className="grid h-[60px] w-[44px] place-items-center rounded-lg border border-line2 bg-gradient-to-br from-[#2a2142] to-[#191427] text-gold"
                >
                  <BookMarked size={16} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:max-w-md">
              {player.reserved.map((c) => (
                <DevCard
                  key={c.id}
                  card={c}
                  buySource={{ from: "reserved", cardId: c.id }}
                  reservedView
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
