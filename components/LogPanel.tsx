"use client";

import { useEffect, useRef } from "react";
import { ScrollText } from "lucide-react";
import { GameEvent } from "@/lib/engine";
import { useGame } from "@/store/gameStore";

const TYPE_LABEL: Record<string, string> = {
  TAKE_THREE: "토큰 3",
  TAKE_TWO: "토큰 2",
  RESERVE: "예약",
  PURCHASE: "구매",
  DISCARD: "반환",
  NOBLE: "귀족",
  PASS: "패스",
};

function nameFor(id: string, names: Record<string, string>): string {
  return names[id] ?? id;
}

export default function LogPanel() {
  const game = useGame((s) => s.game)!;
  const ref = useRef<HTMLDivElement>(null);
  const names: Record<string, string> = Object.fromEntries(
    game.players.map((p) => [p.id, p.name]),
  );

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [game.log.length]);

  const recent: GameEvent[] = game.log.slice(-40);

  return (
    <div className="rounded-xl border border-line bg-velvet-2/70 p-3 shadow-velvet">
      <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-muted2">
        <ScrollText size={13} /> 행동 기록
      </div>
      <div ref={ref} className="thin-scroll max-h-[240px] space-y-1 overflow-y-auto pr-1">
        {recent.length === 0 && <p className="text-[11px] text-ink-muted2">아직 기록이 없습니다.</p>}
        {recent.map((e, i) => (
          <div key={i} className="flex gap-2 text-[11px] leading-snug">
            <span className="shrink-0 text-ink-muted2">T{e.turn}</span>
            <span className="shrink-0 font-medium text-gold-soft">{TYPE_LABEL[e.type] ?? e.type}</span>
            <span className="truncate text-ink-muted">
              {nameFor(e.playerId, names)} · {e.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
