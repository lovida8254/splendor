"use client";

import { useState } from "react";
import clsx from "clsx";
import { ShoppingCart, BookmarkPlus } from "lucide-react";
import { Card, CardSource, deficit, GEM_COLORS, validate } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { GEM_META, GemImg, GemJewel, Pip } from "./gems";
import { PixelScene } from "./PixelScene";
import { cardImage, ImageBg } from "./CardArt";

export default function DevCard({
  card,
  buySource,
  reserveSource,
  reservedView,
}: {
  card: Card;
  buySource: Extract<CardSource, { from: "board" | "reserved" }>;
  reserveSource?: Extract<CardSource, { from: "board" }>;
  reservedView?: boolean;
}) {
  const game = useGame((s) => s.game)!;
  const openPurchase = useGame((s) => s.openPurchase);
  const reserve = useGame((s) => s.reserve);
  const canPlay = useGame((s) => s.canActMain());

  const me = game.players[game.currentPlayerIndex];
  const m = GEM_META[card.bonus];

  const buyCheck = validate(game, { type: "PURCHASE", source: buySource });
  const reserveCheck = reserveSource
    ? validate(game, { type: "RESERVE", source: reserveSource })
    : { ok: false, reason: "" };
  const affordable = canPlay && buyCheck.ok;
  const d = deficit(me, card);
  const cardAnchor =
    buySource.from === "board"
      ? `board-${buySource.level}-${buySource.slot}`
      : `reserved-${buySource.cardId}`;

  const img = cardImage(card);

  return (
    <div
      data-fly-card={cardAnchor}
      className={clsx(
        "card-sheen relative flex min-h-[172px] flex-col overflow-hidden rounded-xl border p-1.5 shadow-velvet animate-pop cm:h-[172px] sm:h-[164px] sm:min-h-0 sm:p-2",
        "transition duration-150 hover:-translate-y-1.5 hover:scale-[1.05] hover:shadow-[0_22px_44px_rgba(0,0,0,.6),0_8px_16px_rgba(0,0,0,.5)] hover:z-20",
        affordable ? "border-gold/70 animate-affordable" : "border-line2",
      )}
      style={{ background: `linear-gradient(157deg, ${m.hex}22 0%, #1d1733 55%, #181228 100%)` }}
    >
      {/* full-card illustration (or pixel scene fallback as background) */}
      <div className="absolute inset-0">
        {img ? (
          <ImageBg
            src={`cards/${img}`}
            fallback={<PixelScene level={card.level} color={card.bonus} cardId={card.id} />}
          />
        ) : (
          <PixelScene level={card.level} color={card.bonus} cardId={card.id} />
        )}
      </div>
      {/* legibility scrim: darken top (header) and bottom (cost/buttons) */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/10 to-black/75" />

      {/* header: prestige + bonus jewel */}
      <div className="relative z-10 flex shrink-0 items-start justify-between">
        <span
          className={clsx(
            "grid h-7 w-7 place-items-center rounded-full font-display text-xl font-bold leading-none sm:h-9 sm:w-9 sm:text-2xl",
            card.prestige > 0 ? "gold-pill text-gold" : "text-transparent",
          )}
        >
          {card.prestige > 0 ? card.prestige : ""}
        </span>
        <span
          className="grid h-7 w-7 place-items-center overflow-hidden rounded-full ring-1 ring-gold/40 sm:h-8 sm:w-8"
          style={{ background: "rgba(0,0,0,.45)" }}
          title={`보너스: ${m.label}`}
        >
          {GemImg({ color: card.bonus, size: 32, className: "h-full w-full" }) ?? <GemJewel color={card.bonus} size={22} />}
        </span>
      </div>

      <div className="min-h-0 flex-1" />

      {/* cost */}
      <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-1">
        {GEM_COLORS.filter((c) => card.cost[c] > 0).map((c) => (
          <Pip key={c} color={c} n={card.cost[c]} size="cost" />
        ))}
        {GEM_COLORS.every((c) => card.cost[c] === 0) && (
          <span className="rounded bg-black/50 px-1 text-[11px] text-ink-muted2">무료</span>
        )}
        {canPlay && !affordable && d.gold > 0 && (
          <span className="ml-auto self-center rounded bg-black/55 px-1 text-[9px] text-ink-muted2">
            부족 {d.gold}
          </span>
        )}
      </div>

      {/* actions */}
      {canPlay && (
        <div className="relative z-10 mt-1 flex shrink-0 flex-col gap-1 xs:flex-row xs:gap-1.5 sm:mt-1.5">
          <button
            disabled={!affordable}
            onClick={() => openPurchase(buySource)}
            title={buyCheck.ok ? "구매" : buyCheck.reason}
            className={clsx(
              "flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-bold transition",
              affordable
                ? "bg-gradient-to-b from-[#e7cf86] to-[#cda14a] text-[#2a200a] hover:brightness-105"
                : "cursor-not-allowed bg-black/50 text-ink-muted2",
            )}
          >
            <ShoppingCart size={12} /> 구매
          </button>
          {reserveSource && !reservedView && (
            <button
              disabled={!reserveCheck.ok}
              onClick={() => reserve(reserveSource)}
              title={reserveCheck.ok ? "예약 (골드 1개 획득)" : reserveCheck.reason}
              className={clsx(
                "flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition",
                reserveCheck.ok
                  ? "gold-frame bg-black/40 text-gold hover:bg-black/50"
                  : "cursor-not-allowed border border-line bg-black/40 text-ink-muted2",
              )}
            >
              <BookmarkPlus size={12} /> 예약
            </button>
          )}
        </div>
      )}
    </div>
  );
}
