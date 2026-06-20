"use client";

import clsx from "clsx";
import { Bot, User, Crown, BookMarked, Gem } from "lucide-react";
import { Card, GEM_COLORS, Player } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { GEM_META, GemToken } from "./gems";
import { PixelScene } from "./PixelScene";
import { cardImage, ImageBg } from "./CardArt";
import { NobleTile } from "./NobleTile";
import DevCard from "./DevCard";

/** A small real-card thumbnail (display only) used for owned-card stacks. */
function MiniCard({ card }: { card: Card }) {
  const img = cardImage(card);
  const m = GEM_META[card.bonus];
  return (
    <div
      className="relative h-[50px] w-[36px] overflow-hidden rounded-md ring-1 ring-black/50 shadow-velvet"
      style={{ background: `linear-gradient(157deg, ${m.hex}33, #181228)` }}
      title={`${m.label} +${card.prestige}`}
    >
      {img ? (
        <ImageBg src={`cards/${img}`} fallback={<PixelScene level={card.level} color={card.bonus} cardId={card.id} />} />
      ) : (
        <PixelScene level={card.level} color={card.bonus} cardId={card.id} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 to-transparent" />
      <span className="absolute left-0.5 top-0.5 font-display text-[11px] font-bold leading-none text-gold drop-shadow-[0_1px_2px_rgba(0,0,0,.9)]">
        {card.prestige > 0 ? card.prestige : ""}
      </span>
      <span
        className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full ring-1 ring-black/50"
        style={{ background: m.hex }}
      />
    </div>
  );
}

/** Owned development cards, stacked per color like physical cards. */
function OwnedCards({ player }: { player: Player }) {
  const hasCards = player.purchased.length > 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold/90">
        <Gem size={12} /> 내 카드 ({player.purchased.length})
      </div>
      {!hasCards ? (
        <p className="text-[11px] text-ink-muted2">아직 없습니다.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {GEM_COLORS.map((c) => {
            const cards = player.purchased
              .filter((p) => p.bonus === c)
              .sort((a, b) => a.level - b.level || a.prestige - b.prestige);
            if (cards.length === 0) return null;
            return (
              <div key={c} className="relative" style={{ height: 50 + (cards.length - 1) * 15, width: 36 }}>
                {cards.map((card, i) => (
                  <div key={card.id} className="absolute left-0" style={{ top: i * 15 }}>
                    <MiniCard card={card} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Bottom dock: the current player's holdings (gems, owned cards, reserved, nobles). */
export default function PlayerDock() {
  const game = useGame((s) => s.game)!;
  const player = game.players[game.currentPlayerIndex];
  const totalTokens = GEM_COLORS.reduce((s, c) => s + player.tokens[c], 0) + player.tokens.gold;

  return (
    <div className="gold-frame panel-glass mt-3 rounded-2xl p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="gold-pill flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold text-ink">
          {player.isAI ? <Bot size={14} className="text-ink-muted" /> : <User size={14} className="text-gold" />}
          {player.name}의 보유
        </span>
        <span className="flex items-center gap-1 font-display text-lg font-bold text-gold">
          <Crown size={15} /> {player.prestige}
        </span>
      </div>

      {/* 내 보석 (tokens) */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gold/90">내 보석</span>
          <span className={clsx("text-[11px]", totalTokens > 10 ? "text-red-300" : "text-ink-muted2")}>
            {totalTokens}/10
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["white", "blue", "green", "red", "black", "gold"] as const).map((c) => (
            <div key={c} className="gold-pill flex items-center gap-1.5 rounded-xl px-2 py-1">
              <GemToken color={c} count={player.tokens[c]} size="sm" showZero />
              <span className="hidden text-[10px] text-ink-muted xs:inline">{GEM_META[c].short}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 내 카드 / 예약 / 귀족 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
        <OwnedCards player={player} />

        <div className="min-w-[120px]">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold/90">
            <BookMarked size={12} /> 보관한 카드 ({player.reserved.length}/3)
          </div>
          {player.reserved.length === 0 ? (
            <p className="text-[11px] text-ink-muted2">없음</p>
          ) : player.isAI ? (
            <div className="flex gap-1.5">
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
            <div className="flex flex-wrap gap-2">
              {player.reserved.map((c) => (
                <div key={c.id} className="w-[92px]">
                  <DevCard card={c} buySource={{ from: "reserved", cardId: c.id }} reservedView />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-[90px]">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold/90">
            <Crown size={12} /> 내 귀족 ({player.nobles.length})
          </div>
          {player.nobles.length === 0 ? (
            <p className="text-[11px] text-ink-muted2">없음</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {player.nobles.map((n) => (
                <NobleTile key={n.id} noble={n} size="sm" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
