"use client";

import clsx from "clsx";
import { Loader2, Flag, Plus, AlertTriangle, Undo2, Clapperboard, Gauge } from "lucide-react";
import { useGame, Speed } from "@/store/gameStore";

const SPEED_LABEL: Record<Speed, string> = { slow: "느림", normal: "보통", fast: "빠름" };

export default function TurnBar() {
  const game = useGame((s) => s.game)!;
  const aiThinking = useGame((s) => s.aiThinking);
  const message = useGame((s) => s.message);
  const abandon = useGame((s) => s.abandon);
  const undo = useGame((s) => s.undo);
  const canUndo = useGame((s) => s.canUndo());
  const enterReplay = useGame((s) => s.enterReplay);
  const speed = useGame((s) => s.speed);
  const setSpeed = useGame((s) => s.setSpeed);
  const actionsCount = useGame((s) => s.actions.length);

  const cur = game.players[game.currentPlayerIndex];
  const finalRound = game.phase === "finalRound";
  const cycleSpeed = () => setSpeed(speed === "slow" ? "normal" : speed === "normal" ? "fast" : "slow");

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl gold-frame panel-glass px-3 py-2 text-sm sm:px-4">
      <span className="flex items-center gap-2">
        <span className={clsx("h-2.5 w-2.5 rounded-full", cur.isAI ? "bg-ink-muted" : "bg-gold shadow-[0_0_10px_#d8b25e]")} />
        <span className="font-semibold text-ink">{cur.name}</span>
        <span className="hidden text-ink-muted2 xs:inline">의 턴</span>
        {aiThinking && <Loader2 size={14} className="animate-spin text-ink-muted" />}
      </span>

      <span className="text-xs text-ink-muted2">R{game.round}</span>

      {finalRound && (
        <span className="flex items-center gap-1 rounded-md bg-gold/15 px-2 py-1 text-xs font-semibold text-gold">
          <Flag size={12} /> 마지막
        </span>
      )}

      {message && (
        <span className="flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-1 text-xs text-red-300 animate-fadein">
          <AlertTriangle size={12} /> {message}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="되돌리기"
          data-testid="undo"
          className="flex items-center gap-1 rounded-lg border border-line2 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-panel-2 disabled:opacity-35"
        >
          <Undo2 size={13} /> <span className="hidden sm:inline">되돌리기</span>
        </button>
        <button
          onClick={cycleSpeed}
          title={`속도: ${SPEED_LABEL[speed]}`}
          className="flex items-center gap-1 rounded-lg border border-line2 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-panel-2"
        >
          <Gauge size={13} /> {SPEED_LABEL[speed]}
        </button>
        <button
          onClick={enterReplay}
          disabled={actionsCount === 0}
          title="리플레이"
          data-testid="replay"
          className="flex items-center gap-1 rounded-lg border border-line2 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-panel-2 disabled:opacity-35"
        >
          <Clapperboard size={13} /> <span className="hidden sm:inline">리플레이</span>
        </button>
        <button
          onClick={() => {
            if (confirm("현재 게임을 끝내고 새 게임을 시작할까요?")) abandon();
          }}
          className="flex items-center gap-1 rounded-lg border border-line2 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-panel-2"
        >
          <Plus size={13} /> <span className="hidden sm:inline">새 게임</span>
        </button>
      </div>
    </div>
  );
}
