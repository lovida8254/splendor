"use client";

import clsx from "clsx";
import { Bot, User, Crown, BookMarked, Brain } from "lucide-react";
import { GEM_COLORS, GemColor, Player } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { GEM_META, GemToken } from "./gems";
import DevCard from "./DevCard";

/**
 * One gem column showing BOTH counts separately:
 *   ▭ rounded rectangle (top) = owned development cards of this color
 *   ● circle (bottom)        = held tokens of this color
 */
function GemColumn({
  color,
  cards,
  tokens,
  playerIndex,
}: {
  color: GemColor;
  cards: number;
  tokens: number;
  playerIndex: number;
}) {
  const m = GEM_META[color];
  const fg = m.textDark ? "#1a1626" : "#fff";
  return (
    <div
      className="flex flex-col items-center gap-1"
      data-fly={`player-${playerIndex}-${color}`}
      title={`${m.label} · 카드 ${cards}장 · 코인 ${tokens}개`}
    >
      {/* owned development cards of this color */}
      <div
        className="grid h-7 w-5 place-items-center rounded-[4px] text-[11px] font-bold ring-1 ring-black/40"
        style={{ background: `linear-gradient(160deg, ${m.hex}, ${m.dark})`, color: fg }}
      >
        {cards}
      </div>
      {/* held tokens as the coin image (same as the bottom dock) */}
      <GemToken color={color} count={tokens} size="xs" showZero />
    </div>
  );
}

export function PlayerSummary({ player, index }: { player: Player; index: number }) {
  const game = useGame((s) => s.game)!;
  const aiThinking = useGame((s) => s.aiThinking);
  const online = useGame((s) => s.online);
  const isCurrent = game.currentPlayerIndex === index && game.phase !== "finished";
  // online connection dot (human seats only)
  const controller = online?.seats[String(index)];
  const showDot = !!online && !player.isAI;
  const connected = !!controller && !!online?.presence.some((m) => m.client === controller);
  const thinking = isCurrent && player.isAI && aiThinking;
  const totalCards = GEM_COLORS.reduce((s, c) => s + player.bonuses[c], 0);
  const totalCoins = GEM_COLORS.reduce((s, c) => s + player.tokens[c], 0) + player.tokens.gold;

  return (
    <div
      data-fly={`player-${index}`}
      className={clsx(
        "gold-frame panel-glass relative flex-1 rounded-2xl p-2.5 transition",
        isCurrent ? "animate-turn" : "opacity-95",
      )}
    >
      {thinking && (
        <div className="gold-pill absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-gold animate-fadein">
          <Brain size={11} /> 생각 중
          <span className="inline-flex">
            <span className="animate-pulse">.</span>
            <span className="animate-pulse [animation-delay:150ms]">.</span>
            <span className="animate-pulse [animation-delay:300ms]">.</span>
          </span>
        </div>
      )}
      {/* name pill + prestige */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="gold-pill flex items-center gap-1.5 rounded-full px-2.5 py-1">
          {showDot && (
            <span
              className={clsx("h-2 w-2 rounded-full", connected ? "bg-green-400" : controller ? "bg-red-400" : "bg-line2")}
              title={connected ? "접속 중" : controller ? "오프라인" : "빈 좌석"}
            />
          )}
          {player.isAI ? <Bot size={13} className="text-ink-muted" /> : <User size={13} className="text-gold" />}
          <span className="max-w-[96px] truncate text-[13px] font-semibold text-ink">{player.name}</span>
        </span>
        <span className="flex items-center gap-1 font-display text-xl font-bold text-gold">
          <Crown size={15} /> {player.prestige}
        </span>
      </div>

      {/* per-color: cards (▭) over coins (●) */}
      <div className="flex items-start justify-between gap-1">
        {GEM_COLORS.map((c) => (
          <GemColumn key={c} color={c} cards={player.bonuses[c]} tokens={player.tokens[c]} playerIndex={index} />
        ))}
        {/* gold: coins only (no cards) */}
        <div
          className="flex flex-col items-center gap-1"
          data-fly={`player-${index}-gold`}
          title={`골드 코인 ${player.tokens.gold}개`}
        >
          <div className="grid h-7 w-5 place-items-center text-[10px] text-ink-muted2">—</div>
          <div className="grid place-items-center">
            <GemToken color="gold" count={player.tokens.gold} size="xs" showZero />
          </div>
        </div>
      </div>

      {/* explicit totals + reserved/nobles */}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-ink-muted2">
        <span>코인 <b className="text-ink">{totalCoins}</b>/10</span>
        <span>· 카드 <b className="text-ink">{totalCards}</b></span>
        <span className="ml-auto flex items-center gap-1">
          <BookMarked size={10} /> {player.reserved.length}/3
        </span>
        <span className="flex items-center gap-1">
          <Crown size={10} /> {player.nobles.length}
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
