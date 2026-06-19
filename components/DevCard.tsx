"use client";

import clsx from "clsx";
import { ShoppingCart, BookmarkPlus } from "lucide-react";
import {
  Card,
  CardSource,
  deficit,
  GameState,
  GEM_COLORS,
  validate,
} from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { GEM_META, Pip } from "./gems";

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
  const purchase = useGame((s) => s.purchase);
  const reserve = useGame((s) => s.reserve);

  const me = game.players[game.currentPlayerIndex];
  const m = GEM_META[card.bonus];

  const buyCheck = validate(game, { type: "PURCHASE", source: buySource });
  const reserveCheck = reserveSource
    ? validate(game, { type: "RESERVE", source: reserveSource })
    : { ok: false, reason: "" };

  const canPlay = humanTurn(game);
  const affordable = canPlay && buyCheck.ok;
  const d = deficit(me, card);

  return (
    <div
      className={clsx(
        "card-sheen relative flex h-[150px] flex-col justify-between rounded-xl border p-2.5 shadow-velvet transition animate-pop",
        affordable
          ? "border-gold/70 shadow-[0_0_0_1px_rgba(216,178,94,.5),0_8px_24px_rgba(0,0,0,.4)]"
          : "border-line2",
      )}
      style={{ background: `linear-gradient(160deg, ${m.hex}22, #1b1630 70%)` }}
    >
      {/* top: prestige + bonus gem */}
      <div className="flex items-start justify-between">
        <span className="font-display text-2xl font-bold leading-none text-gold">
          {card.prestige > 0 ? card.prestige : ""}
        </span>
        <span
          title={`보너스: ${m.label}`}
          className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold ring-1 ring-black/40"
          style={{ background: m.hex, color: m.textDark ? "#1a1626" : "#fff" }}
        >
          {m.short}
        </span>
      </div>

      {/* cost */}
      <div className="flex flex-wrap gap-1">
        {GEM_COLORS.filter((c) => card.cost[c] > 0).map((c) => (
          <Pip key={c} color={c} n={card.cost[c]} />
        ))}
        {GEM_COLORS.every((c) => card.cost[c] === 0) && (
          <span className="text-[11px] text-ink-muted2">무료</span>
        )}
      </div>

      {/* actions */}
      <div className="flex gap-1.5">
        <button
          disabled={!affordable}
          onClick={() => purchase(buySource)}
          title={buyCheck.ok ? "구매" : buyCheck.reason}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold transition",
            affordable
              ? "bg-gradient-to-b from-[#e7cf86] to-[#cda14a] text-[#2a200a] hover:brightness-105"
              : "cursor-not-allowed bg-panel text-ink-muted2 opacity-60",
          )}
        >
          <ShoppingCart size={12} /> 구매
        </button>
        {reserveSource && !reservedView && (
          <button
            disabled={!canPlay || !reserveCheck.ok}
            onClick={() => reserve(reserveSource)}
            title={reserveCheck.ok ? "예약 (+골드)" : reserveCheck.reason}
            className={clsx(
              "flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition",
              canPlay && reserveCheck.ok
                ? "border border-line2 bg-panel text-ink hover:border-gold-soft"
                : "cursor-not-allowed border border-line bg-panel text-ink-muted2 opacity-60",
            )}
          >
            <BookmarkPlus size={12} />
          </button>
        )}
      </div>

      {/* deficit hint */}
      {canPlay && !affordable && d.gold > 0 && (
        <span className="pointer-events-none absolute bottom-1 right-2 text-[9px] text-ink-muted2">
          부족 {d.gold}
        </span>
      )}
    </div>
  );
}
