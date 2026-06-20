"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Loader2, Flag, Plus, AlertTriangle, Undo2, Clapperboard, Gauge, Volume2, VolumeX, Wifi, LogOut, Timer } from "lucide-react";
import { useGame, Speed } from "@/store/gameStore";
import HowToPlay from "./HowToPlay";

function TurnCountdown() {
  const online = useGame((s) => s.online);
  const game = useGame((s) => s.game);
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);
  if (!online || online.status !== "playing" || !game || game.phase === "finished") return null;
  const secs = online.config?.turnSeconds;
  if (!secs || !online.turnStartedAt) return null;
  if (game.players[game.currentPlayerIndex]?.isAI) return null;
  const remain = Math.max(0, Math.ceil(secs - (Date.now() - online.turnStartedAt) / 1000));
  return (
    <span
      className={clsx(
        "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
        remain <= 10 ? "bg-red-500/20 text-red-300" : "bg-black/30 text-ink-muted",
      )}
    >
      <Timer size={12} /> {remain}s
    </span>
  );
}

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
  const sound = useGame((s) => s.sound);
  const setSound = useGame((s) => s.setSound);
  const actionsCount = useGame((s) => s.actions.length);
  const online = useGame((s) => s.online);
  const leaveRoom = useGame((s) => s.leaveRoom);

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

      {online && (
        <span className="flex items-center gap-1 rounded-md bg-gold/10 px-2 py-1 text-xs font-semibold text-gold">
          <Wifi size={12} /> {online.code}
        </span>
      )}
      <TurnCountdown />

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
        {!online && (
          <button
            onClick={undo}
            disabled={!canUndo}
            title="되돌리기"
            data-testid="undo"
            className="flex items-center gap-1 rounded-lg border border-line2 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-panel-2 disabled:opacity-35"
          >
            <Undo2 size={13} /> <span className="hidden sm:inline">되돌리기</span>
          </button>
        )}
        <button
          onClick={cycleSpeed}
          title={`속도: ${SPEED_LABEL[speed]}`}
          className="flex items-center gap-1 rounded-lg border border-line2 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-panel-2"
        >
          <Gauge size={13} /> {SPEED_LABEL[speed]}
        </button>
        <button
          onClick={() => setSound(!sound)}
          title={sound ? "소리 끄기" : "소리 켜기"}
          className="flex items-center gap-1 rounded-lg border border-line2 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-panel-2"
        >
          {sound ? <Volume2 size={13} /> : <VolumeX size={13} />}
        </button>
        {!online && (
          <button
            onClick={enterReplay}
            disabled={actionsCount === 0}
            title="리플레이"
            data-testid="replay"
            className="flex items-center gap-1 rounded-lg border border-line2 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-panel-2 disabled:opacity-35"
          >
            <Clapperboard size={13} /> <span className="hidden sm:inline">리플레이</span>
          </button>
        )}
        <HowToPlay
          label=""
          className="rounded-lg border border-line2 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-panel-2"
        />
        {online ? (
          <button
            onClick={() => {
              if (confirm("방에서 나갈까요?")) leaveRoom();
            }}
            className="flex items-center gap-1 rounded-lg border border-line2 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-panel-2"
          >
            <LogOut size={13} /> <span className="hidden sm:inline">나가기</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (confirm("현재 게임을 끝내고 새 게임을 시작할까요?")) abandon();
            }}
            className="flex items-center gap-1 rounded-lg border border-line2 bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-panel-2"
          >
            <Plus size={13} /> <span className="hidden sm:inline">새 게임</span>
          </button>
        )}
      </div>
    </div>
  );
}
