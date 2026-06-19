"use client";

import { SkipBack, SkipForward, Play, Pause, X, Clapperboard } from "lucide-react";
import { useGame } from "@/store/gameStore";

export default function ReplayBar() {
  const replayActive = useGame((s) => s.replayActive);
  const replayIndex = useGame((s) => s.replayIndex);
  const replayPlaying = useGame((s) => s.replayPlaying);
  const total = useGame((s) => s.history.length - 1);
  const step = useGame((s) => s.replayStep);
  const to = useGame((s) => s.replayTo);
  const playPause = useGame((s) => s.replayPlayPause);
  const exit = useGame((s) => s.exitReplay);
  const game = useGame((s) => s.game);

  if (!replayActive) return null;
  const last = game?.log[game.log.length - 1];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/40 panel-glass p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-fadein">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-gold">
          <Clapperboard size={14} />
          <span className="font-semibold">리플레이</span>
          <span className="text-ink-muted2">{replayIndex} / {total} 수</span>
          {last && <span className="ml-1 truncate text-ink-muted">· {last.detail}</span>}
          <button onClick={exit} className="ml-auto flex items-center gap-1 rounded-md border border-line2 bg-panel px-2 py-1 text-ink-muted hover:bg-panel-2">
            <X size={13} /> 종료
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => step(-1)} className="grid h-9 w-9 place-items-center rounded-lg border border-line2 bg-panel text-ink hover:bg-panel-2"><SkipBack size={16} /></button>
          <button onClick={playPause} className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-b from-[#e7cf86] to-[#cda14a] text-[#2a200a]">
            {replayPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button onClick={() => step(1)} className="grid h-9 w-9 place-items-center rounded-lg border border-line2 bg-panel text-ink hover:bg-panel-2"><SkipForward size={16} /></button>
          <input
            type="range"
            min={0}
            max={total}
            value={replayIndex}
            onChange={(e) => to(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-line2 accent-gold"
          />
        </div>
      </div>
    </div>
  );
}
