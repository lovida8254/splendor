"use client";

import { useState } from "react";
import clsx from "clsx";
import { Crown, Trophy, AlertCircle, Sparkles } from "lucide-react";
import {
  GEM_COLORS,
  standings,
  TOKEN_COLORS,
  TokenColor,
  totalTokens,
} from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { GEM_META, GemToken } from "./gems";
import { NobleTile } from "./NobleTile";

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 animate-fadein">
      <div className="w-full max-w-md rounded-2xl border border-line2 bg-velvet-2 p-5 shadow-velvet">
        {children}
      </div>
    </div>
  );
}

export function DiscardModal() {
  const game = useGame((s) => s.game)!;
  const discard = useGame((s) => s.discard);
  const autoDiscard = useGame((s) => s.autoDiscard);
  const [picked, setPicked] = useState<Partial<Record<TokenColor, number>>>({});

  const player = game.players[game.currentPlayerIndex];
  if (!game.pendingDiscard || player.isAI) return null;

  const excess = totalTokens(player) - 10;
  const pickedTotal = TOKEN_COLORS.reduce((s, c) => s + (picked[c] ?? 0), 0);
  const remaining = excess - pickedTotal;

  function bump(c: TokenColor, delta: number) {
    setPicked((prev) => {
      const cur = prev[c] ?? 0;
      const next = Math.min(player.tokens[c], Math.max(0, cur + delta));
      return { ...prev, [c]: next };
    });
  }

  return (
    <Backdrop>
      <div className="mb-3 flex items-center gap-2 text-gold">
        <AlertCircle size={18} />
        <h2 className="font-display text-lg font-bold">토큰 반환</h2>
      </div>
      <p className="mb-4 text-sm text-ink-muted">
        토큰이 10개를 초과했습니다. <b className="text-gold">{excess}개</b>를 공급처로 반환하세요.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {TOKEN_COLORS.filter((c) => player.tokens[c] > 0).map((c) => (
          <div key={c} className="flex items-center gap-2 rounded-lg border border-line bg-panel/60 p-2">
            <GemToken color={c} count={player.tokens[c]} size="sm" />
            <span className="flex-1 text-xs text-ink">{GEM_META[c].label}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => bump(c, -1)}
                className="grid h-6 w-6 place-items-center rounded bg-velvet text-ink-muted hover:text-ink"
              >
                −
              </button>
              <span className="w-4 text-center text-sm font-semibold text-gold">{picked[c] ?? 0}</span>
              <button
                onClick={() => bump(c, 1)}
                className="grid h-6 w-6 place-items-center rounded bg-velvet text-ink-muted hover:text-ink"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          disabled={remaining !== 0}
          onClick={() => discard(picked)}
          className={clsx(
            "flex-1 rounded-lg py-2.5 text-sm font-semibold transition",
            remaining === 0
              ? "bg-gradient-to-b from-[#e7cf86] to-[#cda14a] text-[#2a200a]"
              : "cursor-not-allowed bg-panel text-ink-muted2",
          )}
        >
          {remaining === 0 ? "반환 확정" : `${remaining}개 더 선택`}
        </button>
        <button
          onClick={() => autoDiscard()}
          className="rounded-lg border border-line2 bg-panel px-3 py-2.5 text-sm text-ink-muted hover:bg-panel-2"
        >
          자동
        </button>
      </div>
    </Backdrop>
  );
}

export function NobleModal() {
  const game = useGame((s) => s.game)!;
  const chooseNoble = useGame((s) => s.chooseNoble);
  const player = game.players[game.currentPlayerIndex];
  if (!game.pendingNoble || player.isAI) return null;

  const choices = game.nobles.filter((n) => game.pendingNoble!.includes(n.id));

  return (
    <Backdrop>
      <div className="mb-3 flex items-center gap-2 text-gold">
        <Sparkles size={18} />
        <h2 className="font-display text-lg font-bold">귀족 선택</h2>
      </div>
      <p className="mb-4 text-sm text-ink-muted">
        여러 귀족의 조건을 충족했습니다. 방문할 귀족 1명을 선택하세요 (+3점).
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {choices.map((n) => (
          <button key={n.id} onClick={() => chooseNoble(n.id)} className="transition hover:scale-105">
            <NobleTile noble={n} eligible />
          </button>
        ))}
      </div>
    </Backdrop>
  );
}

export function GameOverModal() {
  const game = useGame((s) => s.game)!;
  const abandon = useGame((s) => s.abandon);
  if (game.phase !== "finished") return null;

  const ranked = standings(game);

  return (
    <Backdrop>
      <div className="mb-4 text-center">
        <Trophy size={36} className="mx-auto mb-2 text-gold" />
        <h2 className="brand-text font-display text-3xl font-bold tracking-wider">게임 종료</h2>
        <p className="mt-1 text-sm text-gold">{ranked[0].name} 승리!</p>
      </div>

      <div className="space-y-2">
        {ranked.map((p, i) => (
          <div
            key={p.id}
            className={clsx(
              "flex items-center gap-3 rounded-lg border p-2.5",
              i === 0 ? "border-gold/60 bg-gold/10" : "border-line bg-panel/50",
            )}
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-velvet font-display text-sm font-bold text-gold">
              {i + 1}
            </span>
            <span className="flex-1 truncate text-sm font-semibold text-ink">{p.name}</span>
            <span className="text-xs text-ink-muted2">카드 {p.purchased.length} · 귀족 {p.nobles.length}</span>
            <span className="flex items-center gap-1 font-display text-lg font-bold text-gold">
              <Crown size={14} /> {p.prestige}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => abandon()}
        className="mt-5 w-full rounded-xl bg-gradient-to-b from-[#e7cf86] to-[#cda14a] py-3 font-display font-bold tracking-wider text-[#2a200a] transition hover:brightness-105"
      >
        새 게임
      </button>
    </Backdrop>
  );
}
