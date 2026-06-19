"use client";

import clsx from "clsx";
import { Loader2, Flag, Plus, AlertTriangle } from "lucide-react";
import { useGame } from "@/store/gameStore";

export default function TurnBar() {
  const game = useGame((s) => s.game)!;
  const aiThinking = useGame((s) => s.aiThinking);
  const message = useGame((s) => s.message);
  const abandon = useGame((s) => s.abandon);

  const cur = game.players[game.currentPlayerIndex];
  const finalRound = game.phase === "finalRound";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-velvet-2 px-4 py-2.5 text-sm">
      <span className="flex items-center gap-2">
        <span
          className={clsx(
            "h-2.5 w-2.5 rounded-full",
            cur.isAI ? "bg-ink-muted" : "bg-gold shadow-[0_0_10px_#d8b25e]",
          )}
        />
        <span className="font-semibold text-ink">{cur.name}</span>
        <span className="text-ink-muted2">의 턴</span>
        {aiThinking && <Loader2 size={14} className="animate-spin text-ink-muted" />}
      </span>

      <span className="text-xs text-ink-muted2">라운드 {game.round}</span>

      {finalRound && (
        <span className="flex items-center gap-1 rounded-md bg-gold/15 px-2 py-1 text-xs font-semibold text-gold">
          <Flag size={12} /> 마지막 라운드
        </span>
      )}

      {message && (
        <span className="flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-1 text-xs text-red-300 animate-fadein">
          <AlertTriangle size={12} /> {message}
        </span>
      )}

      <button
        onClick={() => {
          if (confirm("현재 게임을 끝내고 새 게임을 시작할까요?")) abandon();
        }}
        className="ml-auto flex items-center gap-1 rounded-lg border border-line2 bg-panel px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-panel-2"
      >
        <Plus size={13} /> 새 게임
      </button>
    </div>
  );
}
