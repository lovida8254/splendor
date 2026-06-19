"use client";

import clsx from "clsx";
import { Check, X } from "lucide-react";
import { GEM_COLORS, validate } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { GEM_META, GemToken } from "./gems";

export default function TokenBank() {
  const game = useGame((s) => s.game)!;
  const selection = useGame((s) => s.selection);
  const toggleToken = useGame((s) => s.toggleToken);
  const clearSelection = useGame((s) => s.clearSelection);
  const confirmTake = useGame((s) => s.confirmTake);

  const cur = game.players[game.currentPlayerIndex];
  const interactive =
    !cur.isAI && !game.pendingDiscard && !game.pendingNoble && game.phase !== "finished";

  const sel = selection.tokens;
  const selectedTotal = GEM_COLORS.reduce((s, c) => s + (sel[c] ?? 0), 0);

  // Determine candidate action validity for the confirm button.
  const twoColor = GEM_COLORS.find((c) => (sel[c] ?? 0) === 2);
  const candidate = twoColor
    ? ({ type: "TAKE_TWO", color: twoColor } as const)
    : ({ type: "TAKE_THREE", colors: GEM_COLORS.filter((c) => (sel[c] ?? 0) === 1) } as const);
  const canConfirm = interactive && selectedTotal > 0 && validate(game, candidate).ok;

  return (
    <div className="rounded-xl border border-line bg-velvet-2/70 p-3 shadow-velvet">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-ink-muted2">공급처</span>
        {selectedTotal > 0 && (
          <span className="text-[11px] text-gold">{selectedTotal}개 선택</span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {GEM_COLORS.map((c) => (
          <div key={c} className="flex items-center gap-2">
            <GemToken
              color={c}
              count={game.pool[c]}
              size="lg"
              selected={(sel[c] ?? 0) > 0}
              highlight={interactive && game.pool[c] > 0}
              onClick={interactive ? () => toggleToken(c) : undefined}
              disabled={!interactive}
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-ink">{GEM_META[c].label}</div>
              <div className="text-[10px] text-ink-muted2">
                {(sel[c] ?? 0) > 0 ? `선택 ${sel[c]}` : `남음 ${game.pool[c]}`}
              </div>
            </div>
          </div>
        ))}

        {/* gold (reserve only) */}
        <div className="flex items-center gap-2 opacity-90">
          <GemToken color="gold" count={game.pool.gold} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-ink">골드</div>
            <div className="text-[10px] text-ink-muted2">예약 시 획득</div>
          </div>
        </div>
      </div>

      {interactive && (
        <div className="mt-3 flex gap-2">
          <button
            disabled={!canConfirm}
            onClick={confirmTake}
            className={clsx(
              "flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-sm font-semibold transition",
              canConfirm
                ? "bg-gradient-to-b from-[#e7cf86] to-[#cda14a] text-[#2a200a] hover:brightness-105"
                : "cursor-not-allowed bg-panel text-ink-muted2 opacity-60",
            )}
          >
            <Check size={15} /> 가져오기
          </button>
          <button
            disabled={selectedTotal === 0}
            onClick={clearSelection}
            className="rounded-lg border border-line2 bg-panel px-3 py-2 text-ink-muted transition hover:bg-panel-2 disabled:opacity-40"
          >
            <X size={15} />
          </button>
        </div>
      )}
      <p className="mt-2 text-[10px] leading-snug text-ink-muted2">
        서로 다른 3색, 또는 4개 이상 남은 색을 2개. (같은 색을 2개 가져오려면 두 번 클릭)
      </p>
    </div>
  );
}
