"use client";

import clsx from "clsx";
import { ShoppingCart, BookmarkPlus } from "lucide-react";
import { Card, CardSource, deficit, GameState, GEM_COLORS, validate } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { GEM_META, GemJewel, Pip } from "./gems";
import { PixelGem } from "./PixelGem";

function humanTurn(game: GameState): boolean {
  const cur = game.players[game.currentPlayerIndex];
  return !cur.isAI && !game.pendingDiscard && !game.pendingNoble && game.phase !== "finished";
}

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
  const replayActive = useGame((s) => s.replayActive);

  const me = game.players[game.currentPlayerIndex];
  const m = GEM_META[card.bonus];

  const buyCheck = validate(game, { type: "PURCHASE", source: buySource });
  const reserveCheck = reserveSource
    ? validate(game, { type: "RESERVE", source: reserveSource })
    : { ok: false, reason: "" };

  const canPlay = humanTurn(game) && !replayActive;
  const affordable = canPlay && buyCheck.ok;
  const d = deficit(me, card);
  const cardAnchor =
    buySource.from === "board"
      ? `board-${buySource.level}-${buySource.slot}`
      : `reserved-${buySource.cardId}`;

  return (
    <div
      data-fly-card={cardAnchor}
      className={clsx(
        "card-sheen relative flex h-[164px] flex-col overflow-hidden rounded-xl border p-2 shadow-velvet transition animate-pop",
        affordable ? "border-gold/70 animate-affordable" : "border-line2",
      )}
      style={{ background: `linear-gradient(157deg, ${m.hex}2e 0%, #211a35 55%, #1a1430 100%)` }}
    >
      {/* decorative arch glow */}
      <div
        className="pointer-events-none absolute -top-10 right-[-30%] h-28 w-28 rounded-full opacity-30 blur-xl"
        style={{ background: m.hex }}
      />
      {/* pixel-art illustration */}
      <div className="pointer-events-none absolute inset-x-0 top-6 grid place-items-center opacity-95">
        <PixelGem color={card.bonus} size={50} />
      </div>

      {/* header: prestige + bonus jewel */}
      <div className="relative flex items-start justify-between">
        <span
          className={clsx(
            "grid h-8 w-8 place-items-center rounded-full font-display text-xl font-bold leading-none",
            card.prestige > 0 ? "gold-pill text-gold" : "text-transparent",
          )}
        >
          {card.prestige > 0 ? card.prestige : ""}
        </span>
        <span
          className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-gold/40"
          style={{ background: "rgba(0,0,0,.25)" }}
          title={`보너스: ${m.label}`}
        >
          <GemJewel color={card.bonus} size={26} />
        </span>
      </div>

      {/* cost — wraps into rows so the footer never gets pushed off the card */}
      <div className="relative mt-auto flex flex-wrap gap-1">
        {GEM_COLORS.filter((c) => card.cost[c] > 0).map((c) => (
          <Pip key={c} color={c} n={card.cost[c]} />
        ))}
        {GEM_COLORS.every((c) => card.cost[c] === 0) && (
          <span className="text-[11px] text-ink-muted2">무료</span>
        )}
      </div>

      {/* actions (always visible) */}
      {canPlay && (
        <div className="relative mt-1.5 flex shrink-0 gap-1.5">
          <button
            disabled={!affordable}
            onClick={() => openPurchase(buySource)}
            title={buyCheck.ok ? "구매" : buyCheck.reason}
            className={clsx(
              "flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-bold transition",
              affordable
                ? "bg-gradient-to-b from-[#e7cf86] to-[#cda14a] text-[#2a200a] hover:brightness-105"
                : "cursor-not-allowed bg-black/30 text-ink-muted2",
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
                  ? "gold-frame bg-black/20 text-gold hover:bg-black/30"
                  : "cursor-not-allowed border border-line bg-black/20 text-ink-muted2",
              )}
            >
              <BookmarkPlus size={12} /> 예약
            </button>
          )}
        </div>
      )}

      {canPlay && !affordable && d.gold > 0 && (
        <span className="pointer-events-none absolute right-2 top-11 rounded bg-black/40 px-1 text-[9px] text-ink-muted2">
          부족 {d.gold}
        </span>
      )}
    </div>
  );
}
