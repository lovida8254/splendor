"use client";

import { useEffect, useState } from "react";
import { Bot, User, Play, RotateCcw, Crown } from "lucide-react";
import clsx from "clsx";
import { AILevel, PlayerConfig } from "@/lib/engine";
import { useGame } from "@/store/gameStore";

type Slot = { name: string; kind: "human" | "ai"; aiLevel: AILevel };

const AI_LABELS: Record<AILevel, string> = { easy: "쉬움", normal: "보통", hard: "어려움" };

function defaultSlots(): Slot[] {
  return [
    { name: "플레이어 1", kind: "human", aiLevel: "normal" },
    { name: "AI 2", kind: "ai", aiLevel: "normal" },
    { name: "AI 3", kind: "ai", aiLevel: "normal" },
    { name: "AI 4", kind: "ai", aiLevel: "hard" },
  ];
}

export default function SetupScreen() {
  const startGame = useGame((s) => s.startGame);
  const resumeGame = useGame((s) => s.resumeGame);
  const hasSave = useGame((s) => s.hasSave);
  const [count, setCount] = useState(2);
  const [slots, setSlots] = useState<Slot[]>(defaultSlots());
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    setCanResume(hasSave());
  }, [hasSave]);

  function update(i: number, patch: Partial<Slot>) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function start() {
    const players: PlayerConfig[] = slots.slice(0, count).map((s) => ({
      name: s.name.trim() || (s.kind === "ai" ? "AI" : "플레이어"),
      isAI: s.kind === "ai",
      aiLevel: s.kind === "ai" ? s.aiLevel : undefined,
    }));
    startGame(players);
  }

  return (
    <div className="safe-area mx-auto max-w-2xl px-4 py-8 animate-fadein sm:px-5 sm:py-10">
      <div className="mb-8 text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-gold">
          <Crown size={26} />
        </div>
        <h1 className="brand-text font-display text-5xl font-bold tracking-[0.18em]">SPLENDOR</h1>
        <p className="mt-2 text-sm text-ink-muted">르네상스 보석상 · 엔진 빌딩 게임</p>
      </div>

      {canResume && (
        <button
          onClick={() => resumeGame()}
          className="btn-gold mb-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display font-bold tracking-wide transition"
        >
          <RotateCcw size={18} /> 이어하기 (저장된 게임)
        </button>
      )}

      <div className="menu-panel rounded-2xl p-5">
        <div className="mb-4">
          <label className="mb-2 block text-xs uppercase tracking-wider text-ink-muted2">인원</label>
          <div className="flex gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={clsx(
                  "flex-1 rounded-lg border py-2.5 font-semibold transition",
                  count === n
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-line2 bg-panel text-ink-muted hover:bg-panel-2",
                )}
              >
                {n}인
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {slots.slice(0, count).map((s, i) => (
            <div key={i} className="menu-inset flex items-center gap-2 rounded-lg p-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-velvet text-sm font-bold text-gold">
                {i + 1}
              </span>
              <input
                value={s.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-line2 bg-velvet px-3 py-1.5 text-sm text-ink outline-none focus:border-gold-soft"
                maxLength={16}
              />
              <div className="flex overflow-hidden rounded-md border border-line2">
                <button
                  onClick={() => update(i, { kind: "human" })}
                  className={clsx(
                    "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition",
                    s.kind === "human" ? "bg-gold/20 text-gold" : "bg-panel text-ink-muted2",
                  )}
                >
                  <User size={13} /> 사람
                </button>
                <button
                  onClick={() => update(i, { kind: "ai" })}
                  className={clsx(
                    "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition",
                    s.kind === "ai" ? "bg-gold/20 text-gold" : "bg-panel text-ink-muted2",
                  )}
                >
                  <Bot size={13} /> AI
                </button>
              </div>
              <select
                value={s.aiLevel}
                onChange={(e) => update(i, { aiLevel: e.target.value as AILevel })}
                disabled={s.kind !== "ai"}
                className="rounded-md border border-line2 bg-velvet px-2 py-1.5 text-xs text-ink outline-none disabled:opacity-30"
              >
                {(["easy", "normal", "hard"] as AILevel[]).map((l) => (
                  <option key={l} value={l}>
                    {AI_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <button
          onClick={start}
          className="btn-gold mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display font-bold tracking-wider transition"
        >
          <Play size={18} /> 게임 시작
        </button>
      </div>

      <p className="mt-5 text-center text-xs text-ink-muted2">먼저 15 명성점에 도달하면 승리</p>
    </div>
  );
}
