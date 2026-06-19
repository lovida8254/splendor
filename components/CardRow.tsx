"use client";

import clsx from "clsx";
import { BookmarkPlus } from "lucide-react";
import { CardLevel, validate } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import DevCard from "./DevCard";

export default function CardRow({ level }: { level: CardLevel }) {
  const game = useGame((s) => s.game)!;
  const reserve = useGame((s) => s.reserve);
  const slots = game.board[level];
  const deckCount = game.decks[level].length;

  const deckReserveCheck = validate(game, { type: "RESERVE", source: { from: "deck", level } });
  const cur = game.players[game.currentPlayerIndex];
  const canReserveDeck =
    !cur.isAI && !game.pendingDiscard && !game.pendingNoble && game.phase !== "finished" && deckReserveCheck.ok;

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
    <div className="grid min-w-[420px] grid-cols-[52px_repeat(4,minmax(84px,1fr))] gap-2 sm:min-w-0 sm:grid-cols-[64px_repeat(4,1fr)] sm:gap-2.5">
      {/* deck */}
      <button
        disabled={!canReserveDeck}
        onClick={() => reserve({ from: "deck", level })}
        title={deckReserveCheck.ok ? "맨 위 카드 블라인드 예약" : deckReserveCheck.reason}
        className={clsx(
          "flex flex-col items-center justify-center rounded-xl border border-dashed text-center transition",
          canReserveDeck
            ? "border-line2 bg-gradient-to-b from-[#241d3a] to-[#191427] hover:border-gold-soft"
            : "border-line bg-[#191427] opacity-90",
        )}
      >
        <span className="font-display text-lg font-bold text-gold">L{level}</span>
        <span className="text-[10px] text-ink-muted2">{deckCount}장</span>
        {canReserveDeck && <BookmarkPlus size={13} className="mt-1 text-ink-muted" />}
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
            className="grid h-[150px] place-items-center rounded-xl border border-line/60 bg-velvet/40 text-xs text-ink-muted2"
          >
            —
          </div>
        ),
      )}
    </div>
    </div>
  );
}
