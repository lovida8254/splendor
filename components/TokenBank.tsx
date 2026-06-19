"use client";

import clsx from "clsx";
import { Check, X, Coins } from "lucide-react";
import { GEM_COLORS, validate } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { GEM_META, GemToken } from "./gems";

export default function TokenBank() {
  const game = useGame((s) => s.game)!;
  const selection = useGame((s) => s.selection);
  const toggleToken = useGame((s) => s.toggleToken);
  const clearSelection = useGame((s) => s.clearSelection);
  const confirmTake = useGame((s) => s.confirmTake);
  const replayActive = useGame((s) => s.replayActive);

  const cur = game.players[game.currentPlayerIndex];
  const interactive =
    !cur.isAI && !game.pendingDiscard && !game.pendingNoble && game.phase !== "finished" && !replayActive;

  const sel = selection.tokens;
  const selectedTotal = GEM_COLORS.reduce((s, c) => s + (sel[c] ?? 0), 0);

  const twoColor = GEM_COLORS.find((c) => (sel[c] ?? 0) === 2);
  const candidate = twoColor
    ? ({ type: "TAKE_TWO", color: twoColor } as const)
    : ({ type: "TAKE_THREE", colors: GEM_COLORS.filter((c) => (sel[c] ?? 0) === 1) } as const);
  const canConfirm = interactive && selectedTotal > 0 && validate(game, candidate).ok;

  return (
    <div className="gold-frame panel-glass flex h-full flex-col rounded-2xl p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold/90">
          <Coins size={14} /> 공급처
        </span>
        {interactive && (
          <div className="flex items-center gap-1.5">
            {selectedTotal > 0 && <span className="text-[11px] text-gold">{selectedTotal} 선택</span>}
            <button
              disabled={!canConfirm}
              onClick={confirmTake}
              data-testid="take-confirm"
              className={clsx(
                "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                canConfirm
                  ? "bg-gradient-to-b from-[#e7cf86] to-[#cda14a] text-[#2a200a] hover:brightness-105"
                  : "cursor-not-allowed bg-black/30 text-ink-muted2",
              )}
            >
              <Check size={14} /> 가져오기
            </button>
            <button
              disabled={selectedTotal === 0}
              onClick={clearSelection}
              className="rounded-lg border border-line2 bg-panel px-2 py-1.5 text-ink-muted transition hover:bg-panel-2 disabled:opacity-40"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* horizontal coin row — fits the empty space beside the nobles */}
      <div className="flex flex-1 flex-wrap items-start justify-around gap-x-2 gap-y-2">
        {GEM_COLORS.map((c) => (
          <div key={c} className="flex w-[52px] flex-col items-center gap-1">
            <GemToken
              color={c}
              count={game.pool[c]}
              size="lg"
              stack
              selected={(sel[c] ?? 0) > 0}
              highlight={interactive && game.pool[c] > 0}
              onClick={interactive ? () => toggleToken(c) : undefined}
              disabled={!interactive}
              testId={`supply-${c}`}
            />
            <span className="text-[10px] font-medium text-ink-muted">{GEM_META[c].short}</span>
            <span className={clsx("text-[10px]", (sel[c] ?? 0) > 0 ? "text-gold" : "text-ink-muted2")}>
              {(sel[c] ?? 0) > 0 ? `+${sel[c]}` : game.pool[c]}
            </span>
          </div>
        ))}
        {/* gold (reserve only) */}
        <div className="flex w-[52px] flex-col items-center gap-1 opacity-95">
          <GemToken color="gold" count={game.pool.gold} size="lg" stack testId="supply-gold" />
          <span className="text-[10px] font-medium text-ink-muted">★</span>
          <span className="text-[10px] text-ink-muted2">{game.pool.gold}</span>
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-ink-muted2">
        서로 다른 3색, 또는 4개 이상 남은 색을 2개(같은 색 두 번 클릭). 골드는 예약 시 획득.
      </p>
    </div>
  );
}
