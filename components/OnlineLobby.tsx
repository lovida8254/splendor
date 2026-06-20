"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Bot, User, Crown, ArrowLeft, Copy, Check, Users, LogIn, Plus, Play, Zap, Loader2 } from "lucide-react";
import { AILevel, PlayerConfig } from "@/lib/engine";
import { useGame, onlineAvailable } from "@/store/gameStore";

const AI_LABELS: Record<AILevel, string> = { easy: "쉬움", normal: "보통", hard: "어려움" };
type Slot = { name: string; kind: "human" | "ai"; aiLevel: AILevel };

function defaultSlots(): Slot[] {
  return [
    { name: "나", kind: "human", aiLevel: "normal" },
    { name: "플레이어 2", kind: "human", aiLevel: "normal" },
    { name: "AI 3", kind: "ai", aiLevel: "normal" },
    { name: "AI 4", kind: "ai", aiLevel: "hard" },
  ];
}

const TURN_OPTIONS: { label: string; value: number | null }[] = [
  { label: "30초", value: 30 },
  { label: "60초", value: 60 },
  { label: "120초", value: 120 },
  { label: "무제한", value: null },
];

function CreateForm() {
  const createRoom = useGame((s) => s.createRoom);
  const [count, setCount] = useState(2);
  const [slots, setSlots] = useState<Slot[]>(defaultSlots());
  const [turnSeconds, setTurnSeconds] = useState<number | null>(60);
  const [aiTakeover, setAiTakeover] = useState(true);
  const upd = (i: number, p: Partial<Slot>) => setSlots((s) => s.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  function create() {
    const players: PlayerConfig[] = slots.slice(0, count).map((s) => ({
      name: s.name.trim() || (s.kind === "ai" ? "AI" : "플레이어"),
      isAI: s.kind === "ai",
      aiLevel: s.kind === "ai" ? s.aiLevel : undefined,
    }));
    createRoom(players, turnSeconds, aiTakeover);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => setCount(n)}
            className={clsx(
              "flex-1 rounded-lg border py-2 font-semibold transition",
              count === n ? "border-gold bg-gold/15 text-gold" : "border-line2 bg-panel text-ink-muted hover:bg-panel-2",
            )}
          >
            {n}인
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {slots.slice(0, count).map((s, i) => (
          <div key={i} className="menu-inset flex items-center gap-2 rounded-lg p-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-velvet text-xs font-bold text-gold">{i + 1}</span>
            <input
              value={s.name}
              onChange={(e) => upd(i, { name: e.target.value })}
              maxLength={16}
              className="min-w-0 flex-1 rounded-md border border-line2 bg-velvet px-2 py-1.5 text-sm text-ink outline-none focus:border-gold-soft"
            />
            <div className="flex overflow-hidden rounded-md border border-line2">
              <button onClick={() => upd(i, { kind: "human" })} className={clsx("flex items-center gap-1 px-2 py-1.5 text-xs", s.kind === "human" ? "bg-gold/20 text-gold" : "bg-panel text-ink-muted2")}>
                <User size={12} /> 사람
              </button>
              <button onClick={() => upd(i, { kind: "ai" })} className={clsx("flex items-center gap-1 px-2 py-1.5 text-xs", s.kind === "ai" ? "bg-gold/20 text-gold" : "bg-panel text-ink-muted2")}>
                <Bot size={12} /> AI
              </button>
            </div>
            <select
              value={s.aiLevel}
              onChange={(e) => upd(i, { aiLevel: e.target.value as AILevel })}
              disabled={s.kind !== "ai"}
              className="rounded-md border border-line2 bg-velvet px-1.5 py-1.5 text-xs text-ink outline-none disabled:opacity-30"
            >
              {(["easy", "normal", "hard"] as AILevel[]).map((l) => (
                <option key={l} value={l}>{AI_LABELS[l]}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-wider text-ink-muted2">턴 제한시간 (초과 시 AI가 대신 진행)</div>
        <div className="flex gap-2">
          {TURN_OPTIONS.map((o) => (
            <button
              key={o.label}
              onClick={() => setTurnSeconds(o.value)}
              className={clsx(
                "flex-1 rounded-lg border py-2 text-sm font-semibold transition",
                turnSeconds === o.value ? "border-gold bg-gold/15 text-gold" : "border-line2 bg-panel text-ink-muted hover:bg-panel-2",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => setAiTakeover((v) => !v)}
        className="menu-inset flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm"
      >
        <span className="text-ink">시간 초과 시 AI 대행</span>
        <span className={clsx("rounded-full px-2 py-0.5 text-xs font-bold", aiTakeover ? "bg-gold/20 text-gold" : "bg-black/30 text-ink-muted2")}>
          {aiTakeover ? "ON" : "OFF"}
        </span>
      </button>
      <p className="text-[11px] text-ink-muted2">사람 자리는 방을 만든 뒤 각자 링크로 들어와 좌석을 선택합니다(좌석을 안 고르면 관전). 방장은 1번 사람 자리를 차지합니다.</p>
      <button onClick={create} className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display font-bold tracking-wide">
        <Plus size={16} /> 방 만들기
      </button>
    </div>
  );
}

function JoinForm() {
  const joinRoom = useGame((s) => s.joinRoom);
  const [code, setCode] = useState("");
  return (
    <div className="space-y-3">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="방 코드 (예: ABCDE)"
        maxLength={6}
        className="w-full rounded-lg border border-line2 bg-velvet px-3 py-3 text-center font-display text-xl tracking-[0.3em] text-ink outline-none focus:border-gold-soft"
      />
      <button
        onClick={() => joinRoom(code)}
        disabled={code.trim().length < 4}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/50 bg-panel py-3 font-semibold text-gold transition hover:bg-panel-2 disabled:opacity-40"
      >
        <LogIn size={16} /> 입장하기
      </button>
    </div>
  );
}

function Room() {
  const online = useGame((s) => s.online)!;
  const claimSeat = useGame((s) => s.claimSeat);
  const startRoom = useGame((s) => s.startRoom);
  const [copied, setCopied] = useState(false);

  const players = online.config?.players ?? [];
  const isHost = online.clientId === online.hostId;
  const link = typeof window !== "undefined" ? `${window.location.origin}/?room=${online.code}` : "";
  const humanSeats = players.map((p, i) => ({ p, i })).filter((x) => !x.p.isAI);
  const allHumansClaimed = humanSeats.every((x) => online.seats[String(x.i)]);

  function copy() {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  }

  return (
    <div className="space-y-4">
      {online.config?.quick && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold">
          <Zap size={14} /> 빠른 매칭 — 상대가 들어오면 자동 시작
        </div>
      )}
      <div className="menu-inset rounded-xl p-3 text-center">
        <div className="text-[11px] uppercase tracking-wider text-ink-muted2">방 코드</div>
        <div className="my-1 font-display text-3xl font-bold tracking-[0.3em] text-gold">{online.code}</div>
        <button onClick={copy} className="mx-auto flex items-center gap-1.5 rounded-lg border border-line2 bg-panel px-3 py-1.5 text-xs text-ink-muted transition hover:bg-panel-2">
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />} 초대 링크 복사
        </button>
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold/90">
          <Users size={13} /> 좌석
        </div>
        <div className="space-y-2">
          {players.map((p, i) => {
            const claimedBy = online.seats[String(i)];
            const mine = claimedBy === online.clientId;
            const conn = !!claimedBy && online.presence.some((m) => m.client === claimedBy);
            return (
              <div key={i} className="menu-inset flex items-center gap-2 rounded-lg p-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-velvet text-xs font-bold text-gold">{i + 1}</span>
                {p.isAI ? (
                  <Bot size={15} className="text-ink-muted" />
                ) : (
                  <span className="flex items-center gap-1">
                    <span className={clsx("h-2 w-2 rounded-full", conn ? "bg-green-400" : claimedBy ? "bg-red-400" : "bg-line2")} />
                    <User size={15} className="text-gold" />
                  </span>
                )}
                <span className="flex-1 truncate text-sm text-ink">{p.name}{p.isAI ? ` (AI·${AI_LABELS[(p.aiLevel as AILevel) ?? "normal"]})` : ""}</span>
                {p.isAI ? (
                  <span className="text-[11px] text-ink-muted2">AI</span>
                ) : mine ? (
                  <span className="rounded-md bg-gold/20 px-2 py-1 text-[11px] font-semibold text-gold">내 자리</span>
                ) : claimedBy ? (
                  <span className="rounded-md bg-green-500/15 px-2 py-1 text-[11px] text-green-300">참가함</span>
                ) : (
                  <button onClick={() => claimSeat(i)} className="rounded-md border border-gold/50 bg-panel px-2.5 py-1 text-[11px] font-semibold text-gold hover:bg-panel-2">
                    앉기
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {(() => {
          const specs = online.presence.filter((m) => m.seat == null);
          return specs.length ? (
            <p className="mt-2 text-[11px] text-ink-muted2">
              관전 {specs.length}명: {specs.map((m) => m.name).join(", ")}
            </p>
          ) : null;
        })()}
      </div>

      {isHost ? (
        <button
          onClick={startRoom}
          disabled={!allHumansClaimed}
          className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display font-bold tracking-wide disabled:opacity-50"
        >
          <Play size={16} /> 게임 시작
        </button>
      ) : (
        <p className="text-center text-sm text-ink-muted">방장이 시작하기를 기다리는 중...</p>
      )}
      {isHost && !allHumansClaimed && (
        <p className="text-center text-[11px] text-ink-muted2">모든 사람 좌석이 채워지면 시작할 수 있습니다.</p>
      )}
    </div>
  );
}

export default function OnlineLobby() {
  const online = useGame((s) => s.online)!;
  const leaveRoom = useGame((s) => s.leaveRoom);
  const joinRoom = useGame((s) => s.joinRoom);
  const quickMatch = useGame((s) => s.quickMatch);
  const matching = useGame((s) => s.matching);
  const [tab, setTab] = useState<"create" | "join">("create");
  const [qmCount, setQmCount] = useState(2);

  // deep-link auto-join (?room=CODE)
  useEffect(() => {
    if (online.view !== "menu") return;
    const code = new URLSearchParams(window.location.search).get("room");
    if (code) joinRoom(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inRoom = online.view === "room";

  return (
    <div className="safe-area mx-auto max-w-lg px-4 py-8 animate-fadein sm:py-10">
      <div className="mb-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-gold"><Crown size={24} /></div>
        <h1 className="brand-text font-display text-4xl font-bold tracking-[0.18em]">온라인 멀티</h1>
      </div>

      {!onlineAvailable && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-center text-sm text-red-300">
          온라인 기능이 설정되지 않았습니다 (Supabase 환경변수 필요).
        </p>
      )}
      {online.error && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-center text-sm text-red-300">{online.error}</p>
      )}

      <div className="menu-panel rounded-2xl p-5">
        {inRoom ? (
          <Room />
        ) : (
          <>
            <div className="mb-2 flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setQmCount(n)}
                  disabled={matching}
                  className={clsx(
                    "flex-1 rounded-lg border py-2 text-sm font-semibold transition disabled:opacity-50",
                    qmCount === n ? "border-gold bg-gold/15 text-gold" : "border-line2 bg-panel text-ink-muted hover:bg-panel-2",
                  )}
                >
                  {n}인
                </button>
              ))}
            </div>
            <button
              onClick={() => quickMatch(qmCount)}
              disabled={matching || !onlineAvailable}
              className="btn-gold mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-display font-bold tracking-wide disabled:opacity-60"
            >
              {matching ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              {matching ? "상대를 찾는 중..." : `빠른 매칭 (${qmCount}인)`}
            </button>
            <div className="mb-3 flex items-center gap-2 text-[11px] text-ink-muted2">
              <span className="h-px flex-1 bg-line2" /> 또는 <span className="h-px flex-1 bg-line2" />
            </div>
            <div className="mb-4 flex overflow-hidden rounded-lg border border-line2">
              <button onClick={() => setTab("create")} className={clsx("flex-1 py-2 text-sm font-semibold transition", tab === "create" ? "bg-gold/20 text-gold" : "bg-panel text-ink-muted")}>방 만들기</button>
              <button onClick={() => setTab("join")} className={clsx("flex-1 py-2 text-sm font-semibold transition", tab === "join" ? "bg-gold/20 text-gold" : "bg-panel text-ink-muted")}>방 참가</button>
            </div>
            {tab === "create" ? <CreateForm /> : <JoinForm />}
          </>
        )}
      </div>

      <button onClick={leaveRoom} className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm text-ink-muted transition hover:text-ink">
        <ArrowLeft size={15} /> {inRoom ? "방 나가기" : "메인으로"}
      </button>
    </div>
  );
}
