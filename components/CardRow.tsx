"use client";

import clsx from "clsx";
import { BookmarkPlus } from "lucide-react";
import { CardLevel, validate } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import DevCard from "./DevCard";

const LEVEL_TINT: Record<CardLevel, string> = {
  1: "#4a4070",
  2: "#caa860",
  3: "#3a72df",
};

export default function CardRow({ level }: { level: CardLevel }) {
  const game = useGame((s) => s.game)!;
  const reserve = useGame((s) => s.reserve);
  const replayActive = useGame((s) => s.replayActive);
  const slots = game.board[level];
  const deckCount = game.decks[level].length;

  const deckReserveCheck = validate(game, { type: "RESERVE", source: { from: "deck", level } });
  const cur = game.players[game.currentPlayerIndex];
  const canReserveDeck =
    !cur.isAI &&
    !game.pendingDiscard &&
    !game.pendingNoble &&
    game.phase !== "finished" &&
    !replayActive &&
    deckReserveCheck.ok;

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="grid min-w-[440px] grid-cols-[58px_repeat(4,minmax(86px,1fr))] gap-2 sm:min-w-0 sm:gap-2.5">
        {/* deck back */}
        <button
          disabled={!canReserveDeck}
          onClick={() => reserve({ from: "deck", level })}
          title={deckReserveCheck.ok ? "맨 위 카드 블라인드 예약 (골드 획득)" : deckReserveCheck.reason || `레벨 ${level} 덱`}
          className={clsx(
            "relative flex h-[164px] flex-col items-center justify-center overflow-hidden rounded-xl border text-center transition",
            canReserveDeck ? "border-gold/60 hover:brightness-110" : "border-line2",
          )}
          style={{
            background: `linear-gradient(160deg, ${LEVEL_TINT[level]}55, #15101f 75%)`,
          }}
        >
          <span className="pointer-events-none absolute inset-1 rounded-lg border border-gold/25" />
          <span className="font-display text-[13px] font-bold tracking-[0.15em] text-gold/90 [writing-mode:vertical-rl]">
            SPLENDOR
          </span>
          <span className="mt-1 flex gap-0.5">
            {Array.from({ length: level }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-gold/80" />
            ))}
          </span>
          <span className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-velvet/90 text-[11px] font-bold text-gold ring-1 ring-gold/40">
            {deckCount}
          </span>
          {canReserveDeck && <BookmarkPlus size={13} className="absolute bottom-1.5 text-gold/70" />}
        </button>

        {/* face-up slots */}
        {slots.map((card, slot) =>
          card ? (
            <DevCard
              key={card.id}
              card={card}
              buySource={{ from: "board", level, slot }}
              reserveSource={{ from: "board", level, slot }}
            />
          ) : (
            <div
              key={`empty-${slot}`}
              className="grid h-[164px] place-items-center rounded-xl border border-dashed border-line/50 bg-velvet/30 text-xs text-ink-muted2"
            >
              —
            </div>
          ),
        )}
      </div>
    </div>
  );
}
