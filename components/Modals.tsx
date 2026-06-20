"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Crown, Trophy, AlertCircle, Sparkles, ShoppingCart, X } from "lucide-react";
import {
  autoPayment,
  Card,
  GEM_COLORS,
  GemColor,
  standings,
  TOKEN_COLORS,
  TokenColor,
  TokenPool,
  totalTokens,
  validatePayment,
  zeroTokens,
} from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import { GEM_META, GemJewel, GemToken, Pip } from "./gems";
import { NobleTile } from "./NobleTile";

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 animate-fadein" onClick={onClose}>
      <div
        className="gold-frame panel-glass w-full max-w-md rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Purchase (manual payment) modal
// ---------------------------------------------------------------------------
export function PurchaseModal() {
  const game = useGame((s) => s.game)!;
  const source = useGame((s) => s.purchaseSource);
  const cancel = useGame((s) => s.cancelPurchase);
  const confirm = useGame((s) => s.confirmPurchase);

  const card: Card | null = useMemo(() => {
    if (!source) return null;
    if (source.from === "board") return game.board[source.level][source.slot] ?? null;
    return game.players[game.currentPlayerIndex].reserved.find((c) => c.id === source.cardId) ?? null;
  }, [source, game]);

  const me = game.players[game.currentPlayerIndex];

  // goldFor[c] = gold tokens substituted for color c. Minimum is the shortfall.
  const nets = useMemo(() => {
    const n: Record<string, number> = {};
    if (card) for (const c of GEM_COLORS) n[c] = Math.max(0, card.cost[c] - me.bonuses[c]);
    return n;
  }, [card, me]);

  const [goldFor, setGoldFor] = useState<Record<string, number>>({});

  if (!source || !card) return null;

  const goldForVal = (c: GemColor) => goldFor[c] ?? Math.max(0, nets[c] - me.tokens[c]);
  const goldTotal = GEM_COLORS.reduce((s, c) => s + goldForVal(c), 0);

  const payment: TokenPool = zeroTokens();
  for (const c of GEM_COLORS) payment[c] = nets[c] - goldForVal(c);
  payment.gold = goldTotal;

  const valid = validatePayment(me, card, payment).ok;

  function adjust(c: GemColor, delta: number) {
    const cur = goldForVal(c);
    let next = cur + delta;
    next = Math.max(0, Math.min(nets[c], next)); // 0..net
    // can't use more color tokens than held
    if (nets[c] - next > me.tokens[c]) next = nets[c] - me.tokens[c];
    // can't exceed total gold held
    const others = goldTotal - cur;
    if (others + next > me.tokens.gold) next = me.tokens.gold - others;
    setGoldFor((p) => ({ ...p, [c]: Math.max(0, next) }));
  }

  const remaining = { ...me.tokens };
  for (const c of TOKEN_COLORS) remaining[c] = me.tokens[c] - (payment[c] ?? 0);
  const m = GEM_META[card.bonus];

  return (
    <Backdrop onClose={cancel}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-gold">
          <ShoppingCart size={18} />
          <h2 className="font-display text-lg font-bold">카드 구매</h2>
        </div>
        <button onClick={cancel} className="text-ink-muted hover:text-ink">
          <X size={18} />
        </button>
      </div>

      {/* card summary */}
      <div className="mb-3 flex items-center gap-3 rounded-xl border border-line2 bg-black/20 p-3">
        <span className="grid h-10 w-10 place-items-center rounded-full ring-1 ring-gold/40" style={{ background: "rgba(0,0,0,.3)" }}>
          <GemJewel color={card.bonus} size={28} />
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-ink">
            {m.label} 보너스 {card.prestige > 0 && <span className="text-gold">· {card.prestige}점</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {GEM_COLORS.filter((c) => card.cost[c] > 0).map((c) => (
              <Pip key={c} color={c} n={card.cost[c]} />
            ))}
          </div>
        </div>
      </div>

      {/* payment allocation */}
      <p className="mb-2 text-xs text-ink-muted">지불 방법 — 색 토큰 대신 골드를 쓰려면 +/−로 조절하세요.</p>
      <div className="space-y-1.5">
        {GEM_COLORS.filter((c) => nets[c] > 0).map((c) => {
          const g = goldForVal(c);
          const col = nets[c] - g;
          return (
            <div key={c} className="flex items-center gap-2 rounded-lg border border-line bg-black/15 p-1.5">
              <Pip color={c} n={nets[c]} />
              <span className="flex-1 text-xs text-ink-muted">
                <b className="text-ink">{col}</b> {GEM_META[c].label.slice(0, 2)} + <b className="text-gold">{g}</b> 골드
              </span>
              <button onClick={() => adjust(c, -1)} className="grid h-6 w-6 place-items-center rounded bg-velvet text-ink-muted hover:text-ink">−</button>
              <span className="w-3 text-center text-[10px] text-gold">{g}</span>
              <button onClick={() => adjust(c, +1)} className="grid h-6 w-6 place-items-center rounded bg-velvet text-ink-muted hover:text-ink">+</button>
            </div>
          );
        })}
        {GEM_COLORS.every((c) => nets[c] === 0) && (
          <p className="text-xs text-ink-muted2">보너스로 전액 충당 — 토큰 지불 없음.</p>
        )}
      </div>

      {/* preview */}
      <div className="mt-3 rounded-lg border border-line bg-black/15 p-2">
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-ink-muted2">구매 후 보유 토큰</div>
        <div className="flex flex-wrap gap-1.5">
          {TOKEN_COLORS.map((c) => (
            <GemToken key={c} color={c} count={remaining[c]} size="xs" showZero />
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          disabled={!valid}
          onClick={() => confirm(payment)}
          className={clsx(
            "flex flex-1 items-center justify-center gap-1 rounded-lg py-2.5 text-sm font-bold transition",
            valid ? "bg-gradient-to-b from-[#e7cf86] to-[#cda14a] text-[#2a200a]" : "cursor-not-allowed bg-black/30 text-ink-muted2",
          )}
        >
          <ShoppingCart size={15} /> 구매 확정 (골드 {goldTotal})
        </button>
        <button onClick={cancel} className="rounded-lg border border-line2 bg-panel px-4 py-2.5 text-sm text-ink-muted hover:bg-panel-2">
          취소
        </button>
      </div>
    </Backdrop>
  );
}

// ---------------------------------------------------------------------------
// Discard
// ---------------------------------------------------------------------------
export function DiscardModal() {
  const game = useGame((s) => s.game)!;
  const discard = useGame((s) => s.discard);
  const autoDiscard = useGame((s) => s.autoDiscard);
  const controls = useGame((s) => s.controlsCurrent());
  const [picked, setPicked] = useState<Partial<Record<TokenColor, number>>>({});

  const player = game.players[game.currentPlayerIndex];
  if (!game.pendingDiscard || !controls) return null;

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
          <div key={c} className="flex items-center gap-2 rounded-lg border border-line bg-black/15 p-2">
            <GemToken color={c} count={player.tokens[c]} size="sm" />
            <span className="flex-1 truncate text-xs text-ink">{GEM_META[c].label}</span>
            <button onClick={() => bump(c, -1)} className="grid h-6 w-6 place-items-center rounded bg-velvet text-ink-muted hover:text-ink">−</button>
            <span className="w-4 text-center text-sm font-semibold text-gold">{picked[c] ?? 0}</span>
            <button onClick={() => bump(c, 1)} className="grid h-6 w-6 place-items-center rounded bg-velvet text-ink-muted hover:text-ink">+</button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          disabled={remaining !== 0}
          onClick={() => discard(picked)}
          className={clsx(
            "flex-1 rounded-lg py-2.5 text-sm font-bold transition",
            remaining === 0 ? "bg-gradient-to-b from-[#e7cf86] to-[#cda14a] text-[#2a200a]" : "cursor-not-allowed bg-black/30 text-ink-muted2",
          )}
        >
          {remaining === 0 ? "반환 확정" : `${remaining}개 더 선택`}
        </button>
        <button onClick={() => autoDiscard()} className="rounded-lg border border-line2 bg-panel px-3 py-2.5 text-sm text-ink-muted hover:bg-panel-2">
          자동
        </button>
      </div>
    </Backdrop>
  );
}

// ---------------------------------------------------------------------------
// Noble choice
// ---------------------------------------------------------------------------
export function NobleModal() {
  const game = useGame((s) => s.game)!;
  const chooseNoble = useGame((s) => s.chooseNoble);
  const controls = useGame((s) => s.controlsCurrent());
  if (!game.pendingNoble || !controls) return null;

  const choices = game.nobles.filter((n) => game.pendingNoble!.includes(n.id));
  return (
    <Backdrop>
      <div className="mb-3 flex items-center gap-2 text-gold">
        <Sparkles size={18} />
        <h2 className="font-display text-lg font-bold">귀족 선택</h2>
      </div>
      <p className="mb-4 text-sm text-ink-muted">여러 귀족의 조건을 충족했습니다. 방문할 귀족 1명을 선택하세요 (+3점).</p>
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

// ---------------------------------------------------------------------------
// Game over
// ---------------------------------------------------------------------------
export function GameOverModal() {
  const game = useGame((s) => s.game)!;
  const abandon = useGame((s) => s.abandon);
  const leaveRoom = useGame((s) => s.leaveRoom);
  const online = useGame((s) => s.online);
  const enterReplay = useGame((s) => s.enterReplay);
  const replayActive = useGame((s) => s.replayActive);
  if (game.phase !== "finished" || replayActive) return null;
  const exit = online ? leaveRoom : abandon;

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
            className={clsx("flex items-center gap-3 rounded-lg border p-2.5", i === 0 ? "border-gold/60 bg-gold/10" : "border-line bg-black/15")}
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-velvet font-display text-sm font-bold text-gold">{i + 1}</span>
            <span className="flex-1 truncate text-sm font-semibold text-ink">{p.name}</span>
            <span className="text-xs text-ink-muted2">카드 {p.purchased.length} · 귀족 {p.nobles.length}</span>
            <span className="flex items-center gap-1 font-display text-lg font-bold text-gold"><Crown size={14} /> {p.prestige}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        <button onClick={() => enterReplay()} className="flex-1 rounded-xl border border-gold/50 bg-panel py-3 font-semibold text-gold transition hover:bg-panel-2">
          리플레이 보기
        </button>
        <button onClick={() => exit()} className="flex-1 rounded-xl bg-gradient-to-b from-[#e7cf86] to-[#cda14a] py-3 font-display font-bold tracking-wider text-[#2a200a] transition hover:brightness-105">
          {online ? "방 나가기" : "새 게임"}
        </button>
      </div>
    </Backdrop>
  );
}
