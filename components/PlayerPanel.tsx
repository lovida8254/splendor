"use client";

import clsx from "clsx";
import { Bot, User, Crown, BookMarked } from "lucide-react";
import { GEM_COLORS, GemColor, Player } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { GEM_META, GemJewel, GemToken } from "./gems";
import DevCard from "./DevCard";

/** One gem column: owned bonus cards (top) + held tokens (bottom), reference-style. */
function GemColumn({ color, cards, tokens }: { color: GemColor; cards: number; tokens: number }) {
  const m = GEM_META[color];
  return (
    <div className="flex flex-col items-center gap-1" title={`${m.label} · 카드 ${cards} · 토큰 ${tokens}`}>
      <div
        className="relative grid h-9 w-7 place-items-center rounded-[5px] ring-1 ring-black/40"
        style={{ background: `linear-gradient(160deg, ${m.hex}, ${m.dark})` }}
      >
        <GemJewel color={color} size={15} />
        <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-velvet px-0.5 text-[10px] font-bold text-gold ring-1 ring-gold/40">
          {cards}
        </span>
      </div>
      <span className={clsx("text-[11px] font-semibold tabular-nums", tokens > 0 ? "text-ink" : "text-ink-muted2")}>
        {tokens}
      </span>
    </div>
  );
}

export function PlayerSummary({ player, index }: { player: Player; index: number }) {
  const game = useGame((s) => s.game)!;
  const isCurrent = game.currentPlayerIndex === index && game.phase !== "finished";

  return (
    <div
      className={clsx(
        "gold-frame panel-glass relative flex-1 rounded-2xl p-2.5 transition",
        isCurrent ? "animate-turn" : "opacity-95",
      )}
    >
      {/* name pill + prestige */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="gold-pill flex items-center gap-1.5 rounded-full px-2.5 py-1">
          {player.isAI ? <Bot size={13} className="text-ink-muted" /> : <User size={13} className="text-gold" />}
          <span className="max-w-[96px] truncate text-[13px] font-semibold text-ink">{player.name}</span>
        </span>
        <span className="flex items-center gap-1 font-display text-xl font-bold text-gold">
          <Crown size={15} /> {player.prestige}
        </span>
      </div>

      {/* gem columns */}
      <div className="flex items-start justify-between gap-1">
        {GEM_COLORS.map((c) => (
          <GemColumn key={c} color={c} cards={player.bonuses[c]} tokens={player.tokens[c]} />
        ))}
        {/* gold tokens */}
        <div className="flex flex-col items-center gap-1" title={`골드 토큰 ${player.tokens.gold}`}>
          <div className="grid h-9 w-7 place-items-center">
            <GemToken color="gold" count={player.tokens.gold} size="sm" showZero={false} />
          </div>
          <span className="text-[11px] font-semibold tabular-nums text-ink-muted2">{player.tokens.gold}</span>
        </div>
      </div>

      {/* footers: reserved + nobles */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-ink-muted2">
        <span className="flex items-center gap-1">
          <BookMarked size={11} /> 예약 {player.reserved.length}/3
        </span>
        <span className="flex items-center gap-1">
          <Crown size={11} /> 귀족 {player.nobles.length}
        </span>
      </div>
    </div>
  );
}

/** The active player's reserved cards (buyable for a human). */
export function ReservedDock() {
  const game = useGame((s) => s.game)!;
  const player = game.players[game.currentPlayerIndex];
  if (player.reserved.length === 0) return null;

  return (
    <div className="gold-frame panel-glass rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold/90">
        <BookMarked size={13} /> {player.name}의 예약 카드 ({player.reserved.length}/3)
      </div>
      {player.isAI ? (
        <div className="flex gap-2">
          {player.reserved.map((c) => (
            <div
              key={c.id}
              className="grid h-[64px] w-[46px] place-items-center rounded-lg border border-gold/30 bg-gradient-to-br from-[#2a2142] to-[#191427] text-gold"
            >
              <BookMarked size={16} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          {player.reserved.map((c) => (
            <DevCard key={c.id} card={c} buySource={{ from: "reserved", cardId: c.id }} reservedView />
          ))}
        </div>
      )}
    </div>
  );
}
