"use client";

import { create } from "zustand";
import { aiAction } from "@/lib/ai/ai";
import { triggerFly } from "@/lib/flyTrigger";
import { runEffects } from "@/lib/effects";
import { setSoundEnabled, unlockAudio } from "@/lib/sound";
import { supabase, supabaseEnabled, RoomRow, ChatRow, PresenceRow } from "@/lib/supabase";
import { pushToast } from "@/store/toastStore";
import { recordGameOnce, StatMode } from "@/lib/stats";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Action,
  AILevel,
  applyAction,
  autoDiscard as computeAutoDiscard,
  Card,
  CardSource,
  GameState,
  GemColor,
  GEM_COLORS,
  mulberry32,
  newGame,
  PlayerConfig,
  RNG,
  TokenColor,
  TokenPool,
  validate,
} from "@/lib/engine";

const SAVE_KEY = "splendor:save:v2";
const SETTINGS_KEY = "splendor:settings:v1";
const ROOM_KEY = "splendor:room"; // last joined online room (for auto-reconnect)

function rememberRoom(code: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(ROOM_KEY, code);
}
function forgetRoom() {
  if (typeof window !== "undefined") window.localStorage.removeItem(ROOM_KEY);
}

export type Speed = "slow" | "normal" | "fast";
const SPEED_MS: Record<Speed, number> = { slow: 1100, normal: 600, fast: 280 };

export interface GameConfig {
  players: PlayerConfig[];
  seed: number;
  turnSeconds?: number | null; // online turn time limit (null/0 = unlimited)
  aiTakeover?: boolean; // on timeout, let AI play the AFK human's turn
  quick?: boolean; // public quick-match room
}

export interface PresenceMember {
  client: string;
  name: string;
  seat: number | null;
}

interface SaveSnapshot {
  config: GameConfig;
  actions: Action[];
}

interface Selection {
  tokens: Partial<Record<GemColor, number>>;
}

const DUMMY_RNG: RNG = mulberry32(0); // reconstruction is deterministic (rng unused there)

export interface OnlineState {
  view: "menu" | "room";
  code: string | null;
  clientId: string;
  hostId: string | null;
  seats: Record<string, string>; // seatIndex -> clientId (human seats only)
  status: "lobby" | "playing" | "finished";
  config: GameConfig | null;
  turnStartedAt: number | null; // local Date.now() when the current turn began
  presence: PresenceMember[]; // currently-connected clients in the room
  error: string | null;
}

export const onlineAvailable = supabaseEnabled;

function getClientId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem("splendor:client");
  if (!id) {
    id = "c_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    window.localStorage.setItem("splendor:client", id);
  }
  return id;
}

function genRoomCode(): string {
  const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let s = "";
  for (let i = 0; i < 5; i++) s += ALPH[Math.floor(Math.random() * ALPH.length)];
  return s;
}

interface Store {
  config: GameConfig | null;
  actions: Action[];
  history: GameState[]; // history[k] = state after applying actions[0..k-1]
  game: GameState | null; // currently viewed state (live or replay)
  rng: RNG;
  selection: Selection;
  message: string | null;
  aiThinking: boolean;
  speed: Speed;
  sound: boolean;

  // manual purchase flow
  purchaseSource: Extract<CardSource, { from: "board" | "reserved" }> | null;

  // replay
  replayActive: boolean;
  replayIndex: number;
  replayPlaying: boolean;

  startGame: (players: PlayerConfig[]) => void;
  resumeGame: () => boolean;
  hasSave: () => boolean;
  abandon: () => void;

  // tutorial (1-player sandbox + coach overlay)
  tutorialStep: number | null;
  startTutorial: () => void;
  tutorialNext: () => void;
  endTutorial: () => void;

  toggleToken: (color: GemColor) => void;
  clearSelection: () => void;
  confirmTake: () => void;

  reserve: (source: Extract<CardSource, { from: "board" | "deck" }>) => void;
  openPurchase: (source: Extract<CardSource, { from: "board" | "reserved" }>) => void;
  cancelPurchase: () => void;
  confirmPurchase: (payment?: TokenPool) => void;
  discard: (tokens: Partial<TokenPool>) => void;
  autoDiscard: () => void;
  chooseNoble: (id: string) => void;

  undo: () => void;
  canUndo: () => boolean;

  enterReplay: () => void;
  exitReplay: () => void;
  replayTo: (index: number) => void;
  replayStep: (delta: number) => void;
  replayPlayPause: () => void;

  setSpeed: (s: Speed) => void;
  setSound: (b: boolean) => void;
  setMessage: (m: string | null) => void;

  // online multiplayer
  online: OnlineState | null;
  openOnline: () => void;
  closeOnline: () => void;
  createRoom: (players: PlayerConfig[], turnSeconds?: number | null, aiTakeover?: boolean, quick?: boolean) => Promise<void>;
  joinRoom: (code: string) => Promise<boolean>;
  quickMatch: (players?: number) => Promise<void>;
  matching: boolean;
  tryReconnect: () => Promise<void>;
  claimSeat: (seat: number) => Promise<void>;
  startRoom: () => Promise<void>;
  rematch: () => Promise<void>;
  leaveRoom: () => void;
  controlsCurrent: () => boolean;
  canActMain: () => boolean;

  // chat
  chat: { id: number; name: string; client: string; text: string }[];
  sendChat: (text: string) => Promise<void>;
}

function rebuildHistory(config: GameConfig, actions: Action[]): GameState[] {
  const history: GameState[] = [newGame({ players: config.players, seed: config.seed })];
  let state = history[0];
  for (const a of actions) {
    state = applyAction(state, a, DUMMY_RNG);
    history.push(state);
  }
  return history;
}

function isHumanDecision(s: GameState): boolean {
  if (s.phase === "finished" || s.pendingDiscard || s.pendingNoble) return false;
  return !s.players[s.currentPlayerIndex].isAI;
}

function persist(config: GameConfig, actions: Action[]) {
  if (typeof window === "undefined") return;
  try {
    const snap: SaveSnapshot = { config, actions };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
  } catch {
    /* ignore */
  }
}

function loadSnapshot(): SaveSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SaveSnapshot) : null;
  } catch {
    return null;
  }
}

function loadSettings(): { speed: Speed; sound: boolean } {
  const def = { speed: "normal" as Speed, sound: true };
  if (typeof window === "undefined") return def;
  try {
    const v = window.localStorage.getItem(SETTINGS_KEY);
    if (!v) return def;
    const o = JSON.parse(v);
    return { speed: (o.speed as Speed) ?? "normal", sound: o.sound !== false };
  } catch {
    return def;
  }
}

function saveSettings(speed: Speed, sound: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ speed, sound }));
  } catch {
    /* ignore */
  }
}

export const useGame = create<Store>((set, get) => {
  let aiTimer: ReturnType<typeof setTimeout> | null = null;
  let replayTimer: ReturnType<typeof setInterval> | null = null;
  const initialSettings = loadSettings();
  setSoundEnabled(initialSettings.sound);

  function clearTimers() {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    if (replayTimer) {
      clearInterval(replayTimer);
      replayTimer = null;
    }
  }

  /** Record a finished game to local stats (deduped). */
  function recordFinish(game: GameState | null) {
    if (!game || game.phase !== "finished" || !game.winnerId) return;
    const s = get();
    if (s.tutorialStep !== null) return; // don't record tutorial games
    const seed = s.online?.config?.seed ?? s.config?.seed ?? 0;
    const sig = `${seed}:${game.winnerId}:${game.turnCount}`;
    let mode: StatMode;
    let meIndex: number | null = null;
    if (s.online) {
      mode = "online";
      const k = Object.keys(s.online.seats).find((key) => s.online!.seats[key] === s.online!.clientId);
      meIndex = k != null ? Number(k) : null;
    } else {
      mode = game.players.some((p) => p.isAI) ? "ai" : "hotseat";
      if (mode === "ai") {
        const idx = game.players.findIndex((p) => !p.isAI);
        meIndex = idx >= 0 ? idx : null;
      }
    }
    const me = meIndex != null ? game.players[meIndex] : null;
    const winner = game.players.find((p) => p.id === game.winnerId);
    recordGameOnce(sig, {
      ts: Date.now(),
      mode,
      players: game.players.length,
      names: game.players.map((p) => p.name),
      winner: winner?.name ?? "",
      meWon: me ? game.winnerId === me.id : null,
      mePrestige: me ? me.prestige : null,
      meCards: me ? me.purchased.length : null,
      meNobles: me ? me.nobles.length : null,
      turns: game.turnCount,
    });

    // Online: record my result to the server for the global leaderboard.
    if (mode === "online" && me && s.online && supabase) {
      supabase
        .from("results")
        .upsert(
          {
            game_id: `${s.online.code}:${seed}`,
            client: s.online.clientId,
            name: me.name,
            won: game.winnerId === me.id,
            prestige: me.prestige,
            cards: me.purchased.length,
            nobles: me.nobles.length,
            players: game.players.length,
            turns: game.turnCount,
          },
          { onConflict: "game_id,client", ignoreDuplicates: true },
        )
        .then(() => {});
    }
  }

  /** Apply a legal action to the live game, recording it for undo/replay. */
  function commit(action: Action) {
    const s = get();
    if (s.replayActive || !s.game) return;
    if (s.online && s.online.status !== "lobby") return onlineCommit(action);
    const v = validate(s.game, action);
    if (!v.ok) {
      set({ message: v.reason ?? "잘못된 행동" });
      return;
    }
    const animMs = triggerFly(s.game, action);
    const next = applyAction(s.game, action, s.rng);
    const actions = [...s.actions, action];
    const history = [...s.history, next];
    set({ game: next, actions, history, selection: { tokens: {} }, message: null });
    runEffects(s.game, next, action);
    if (s.config && s.tutorialStep === null) persist(s.config, actions);
    recordFinish(next);
    scheduleAI(animMs);
  }

  // The next AI move waits for the current action's fly animation to finish,
  // but never less than the speed setting.
  function scheduleAI(animMs = 0) {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    const s = get();
    if (s.online) return; // online uses host-driven AI (maybeHostAI)
    if (s.replayActive || !s.game || s.game.phase === "finished") {
      set({ aiThinking: false });
      return;
    }
    if (!s.game.players[s.game.currentPlayerIndex].isAI) {
      set({ aiThinking: false });
      return;
    }
    set({ aiThinking: true });
    aiTimer = setTimeout(() => {
      const st = get();
      if (st.replayActive || !st.game || st.game.phase === "finished") {
        set({ aiThinking: false });
        return;
      }
      if (!st.game.players[st.game.currentPlayerIndex].isAI) {
        set({ aiThinking: false });
        return;
      }
      try {
        const action = aiAction(st.game, st.rng);
        const nextAnim = triggerFly(st.game, action);
        const next = applyAction(st.game, action, st.rng);
        const actions = [...st.actions, action];
        const history = [...st.history, next];
        set({ game: next, actions, history });
        runEffects(st.game, next, action);
        if (st.config) persist(st.config, actions);
        recordFinish(next);
        scheduleAI(nextAnim);
      } catch (e) {
        set({ aiThinking: false, message: `AI 오류: ${(e as Error).message}` });
      }
    }, Math.max(SPEED_MS[get().speed], animMs));
  }

  function findCard(
    game: GameState,
    source: Extract<CardSource, { from: "board" | "reserved" }>,
  ): Card | null {
    if (source.from === "board") return game.board[source.level][source.slot] ?? null;
    return game.players[game.currentPlayerIndex].reserved.find((c) => c.id === source.cardId) ?? null;
  }

  // ---- online multiplayer ----
  let roomChannel: RealtimeChannel | null = null;
  let roomPoll: ReturnType<typeof setInterval> | null = null;
  let turnTimer: ReturnType<typeof setInterval> | null = null;
  let takeoverForLen = -1; // actions.length we already triggered a timeout takeover for
  let quickStarting = false; // quick-match host has triggered auto-start

  /** The single connected client responsible for automation (AI seats, takeover, host handoff). */
  function effectiveDriverId(o: OnlineState, connected: Set<string>): string | null {
    if (o.hostId && connected.has(o.hostId)) return o.hostId; // host drives while connected
    // host offline -> lowest-seat connected human controller takes over
    const seatNums = Object.keys(o.seats)
      .map(Number)
      .sort((a, b) => a - b);
    for (const k of seatNums) {
      const c = o.seats[String(k)];
      if (connected.has(c)) return c;
    }
    return null;
  }

  /** Schedule an AI move for the current seat (driver only), once per state revision. */
  function scheduleAIMove(delay: number) {
    const s = get();
    takeoverForLen = s.actions.length;
    set({ aiThinking: true });
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = setTimeout(() => {
      const st = get();
      if (!st.online || st.online.status !== "playing" || !st.game || st.game.phase === "finished") {
        set({ aiThinking: false });
        return;
      }
      const connected = new Set(st.online.presence.map((m) => m.client));
      if (effectiveDriverId(st.online, connected) !== st.online.clientId) {
        set({ aiThinking: false });
        return;
      }
      try {
        onlineApplyAndPush(aiAction(st.game, st.rng));
      } catch (e) {
        set({ aiThinking: false, message: `AI 오류: ${(e as Error).message}` });
      }
    }, delay);
  }

  /** Drive online automation: AI seats, offline-seat takeover, AFK timeout, host handoff. */
  function driveAutomation() {
    const s = get();
    const o = s.online;
    if (!o || o.status !== "playing" || !s.game || s.game.phase === "finished") {
      set({ aiThinking: false });
      return;
    }
    const connected = new Set(o.presence.map((m) => m.client));
    if (effectiveDriverId(o, connected) !== o.clientId) {
      set({ aiThinking: false });
      return;
    }
    // host auto-handoff: if the recorded host is offline, claim it
    if (o.hostId !== o.clientId && (!o.hostId || !connected.has(o.hostId)) && supabase && o.code) {
      supabase
        .from("rooms")
        .update({ host: o.clientId })
        .eq("code", o.code)
        .then(() => void pollRoom());
    }
    if (takeoverForLen === s.actions.length) return; // already acting on this state
    const idx = s.game.currentPlayerIndex;
    const cur = s.game.players[idx];
    const cfg = o.config;
    if (cur.isAI) {
      scheduleAIMove(SPEED_MS[s.speed] + 200);
      return;
    }
    // human seat
    const controller = o.seats[String(idx)];
    const seatOnline = !!controller && connected.has(controller);
    if (!seatOnline) {
      if (cfg?.aiTakeover === false) return; // host chose to wait for AFK players
      pushToast({ tone: "ai", title: cur.name, sub: "연결 끊김 — AI가 대신 진행합니다" });
      scheduleAIMove(SPEED_MS[s.speed] + 200);
      return;
    }
    // connected but possibly idle: enforce the turn timeout
    if (!cfg || cfg.aiTakeover === false || !cfg.turnSeconds || !o.turnStartedAt) return;
    if ((Date.now() - o.turnStartedAt) / 1000 < cfg.turnSeconds) return;
    pushToast({ tone: "ai", title: cur.name, sub: "시간 초과 — AI가 대신 진행합니다" });
    scheduleAIMove(0);
  }

  async function pollRoom() {
    const s = get();
    if (!s.online || !s.online.code || !supabase) return;
    const { data } = await supabase.from("rooms").select("*").eq("code", s.online.code).maybeSingle();
    if (data) applyRoom(data as RoomRow);
  }

  let presenceTimer: ReturnType<typeof setInterval> | null = null;
  function mySeatIndex(o: OnlineState): number | null {
    const k = Object.keys(o.seats).find((key) => o.seats[key] === o.clientId);
    return k != null ? Number(k) : null;
  }
  async function heartbeat() {
    const s = get();
    if (!s.online || !s.online.code || !supabase) return;
    await supabase
      .from("presence")
      .upsert(
        {
          room: s.online.code,
          client: s.online.clientId,
          name: myDisplayName(s),
          seat: mySeatIndex(s.online),
          last_seen: new Date().toISOString(),
        },
        { onConflict: "room,client" },
      );
  }
  async function pollPresence() {
    const s = get();
    if (!s.online || !s.online.code || !supabase) return;
    const { data } = await supabase.from("presence").select("*").eq("room", s.online.code);
    const rows = (data ?? []) as PresenceRow[];
    const now = Date.now();
    const members = rows
      .filter((r) => now - Date.parse(r.last_seen) < 8000) // ~2 missed heartbeats = offline
      .map((r) => ({ client: r.client, name: r.name, seat: r.seat }));
    set((st) => (st.online ? { online: { ...st.online, presence: members } } : {}));
  }

  let lastMsgId = 0;
  async function pollMessages() {
    const s = get();
    if (!s.online || !s.online.code || !supabase) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room", s.online.code)
      .gt("id", lastMsgId)
      .order("id")
      .limit(100);
    const rows = (data ?? []) as ChatRow[];
    if (rows.length) {
      lastMsgId = rows[rows.length - 1].id;
      set((st) => ({
        chat: [...st.chat, ...rows.map((r) => ({ id: r.id, name: r.name, client: r.client, text: r.text }))].slice(-200),
      }));
    }
  }

  function myDisplayName(s: Store): string {
    const o = s.online;
    if (!o || !o.config) return "관전자";
    const seat = Object.keys(o.seats).find((k) => o.seats[k] === o.clientId);
    if (seat != null) return o.config.players[Number(seat)]?.name ?? "플레이어";
    return "관전자";
  }

  function controlsCurrentImpl(s: Store): boolean {
    const g = s.game;
    if (!g || s.replayActive || g.phase === "finished") return false;
    if (!s.online) return !g.players[g.currentPlayerIndex].isAI; // local hotseat
    return s.online.seats[String(g.currentPlayerIndex)] === s.online.clientId;
  }

  /** Apply an action optimistically and push the new action log to the room. */
  function onlineApplyAndPush(action: Action) {
    const s = get();
    if (!s.online || !s.game || !supabase) return;
    const next = applyAction(s.game, action, s.rng);
    const actions = [...s.actions, action];
    const history = [...s.history, next];
    triggerFly(s.game, action);
    set({
      game: next,
      actions,
      history,
      selection: { tokens: {} },
      message: null,
      online: { ...s.online, turnStartedAt: Date.now() },
    });
    takeoverForLen = -1;
    runEffects(s.game, next, action);
    recordFinish(next);
    const status = next.phase === "finished" ? "finished" : "playing";
    supabase
      .from("rooms")
      .update({ actions, status })
      .eq("code", s.online.code)
      .then(({ error }) => {
        if (error) set({ message: `동기화 오류: ${error.message}` });
      });
    driveAutomation();
  }

  function onlineCommit(action: Action) {
    const s = get();
    if (!s.game || !s.online) return;
    if (!controlsCurrentImpl(s)) {
      set({ message: "당신 차례가 아닙니다" });
      return;
    }
    const v = validate(s.game, action);
    if (!v.ok) {
      set({ message: v.reason ?? "잘못된 행동" });
      return;
    }
    onlineApplyAndPush(action);
  }

  /** Reconcile local state with an incoming room row (realtime or fetch). */
  function applyRoom(row: RoomRow) {
    const s = get();
    if (!s.online || s.online.code !== row.code) return;
    const config: GameConfig = {
      players: row.config.players as PlayerConfig[],
      seed: row.config.seed,
      turnSeconds: row.config.turnSeconds ?? null,
      aiTakeover: row.config.aiTakeover,
      quick: row.config.quick,
    };
    const incoming = (row.actions ?? []) as Action[];
    // A new seed means a rematch/reset — force a full rebuild.
    const seedChanged = !!s.online.config && s.online.config.seed !== config.seed;

    // Still in the lobby: just track metadata; no game to build yet.
    if (row.status === "lobby") {
      set({
        game: null,
        online: { ...s.online, seats: row.seats ?? {}, hostId: row.host, status: "lobby", config, turnStartedAt: null },
      });
      // quick match: host auto-starts as soon as all human seats are claimed
      if (config.quick && row.host === s.online.clientId && !quickStarting) {
        const humans = config.players.map((p, i) => ({ p, i })).filter((x) => !x.p.isAI);
        const full = humans.length > 0 && humans.every((x) => (row.seats ?? {})[String(x.i)]);
        if (full) {
          quickStarting = true;
          void get().startRoom();
        }
      }
      return;
    }

    // Playing/finished but we're already at/ahead of this revision (e.g. our own
    // optimistic echo) and the game is built — only refresh metadata.
    if (!seedChanged && s.game && incoming.length <= s.actions.length) {
      set({
        online: {
          ...s.online,
          seats: row.seats ?? {},
          hostId: row.host,
          status: s.game.phase === "finished" ? "finished" : "playing",
          config,
        },
      });
      driveAutomation();
      return;
    }
    let history: GameState[];
    try {
      history = rebuildHistory(config, incoming);
    } catch {
      return;
    }
    const game = history[history.length - 1];
    // animate/sound the newest action (covers opponents' moves); skip on rematch reset
    if (!seedChanged && history.length >= 2 && incoming.length === s.actions.length + 1) {
      const prevState = history[history.length - 2];
      const last = incoming[incoming.length - 1];
      triggerFly(prevState, last);
      runEffects(prevState, game, last);
    }
    set({
      game,
      actions: incoming,
      history,
      online: {
        ...s.online,
        seats: row.seats ?? {},
        hostId: row.host,
        status: game.phase === "finished" ? "finished" : "playing",
        config,
        turnStartedAt: Date.now(), // a new turn began (state advanced)
      },
    });
    takeoverForLen = -1;
    recordFinish(game);
    driveAutomation();
  }

  function subscribeRoom(code: string) {
    if (!supabase) return;
    if (roomChannel) {
      supabase.removeChannel(roomChannel);
      roomChannel = null;
    }
    roomChannel = supabase
      .channel(`room:${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "splendor", table: "rooms", filter: `code=eq.${code}` },
        (payload) => {
          const row = payload.new as RoomRow;
          if (row && row.code) applyRoom(row);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "splendor", table: "messages", filter: `room=eq.${code}` },
        () => void pollMessages(),
      )
      .subscribe();
    // reset chat for the new room
    lastMsgId = 0;
    set({ chat: [] });
    // Polling fallback so sync works even if realtime is unavailable.
    if (roomPoll) clearInterval(roomPoll);
    roomPoll = setInterval(() => {
      void pollRoom();
      void pollMessages();
      void pollPresence();
    }, 1200);
    void pollRoom();
    void pollMessages();
    void pollPresence();
    // Presence heartbeat (5s) — declares this client online.
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = setInterval(() => void heartbeat(), 3000);
    void heartbeat();
    // Turn-timeout watcher (1s tick) — drives AI takeover for AFK players.
    if (turnTimer) clearInterval(turnTimer);
    turnTimer = setInterval(() => driveAutomation(), 1000);
  }

  return {
    config: null,
    actions: [],
    history: [],
    game: null,
    rng: mulberry32(0x5eed),
    selection: { tokens: {} },
    message: null,
    aiThinking: false,
    speed: initialSettings.speed,
    sound: initialSettings.sound,
    purchaseSource: null,
    replayActive: false,
    replayIndex: 0,
    replayPlaying: false,
    online: null,
    matching: false,
    tutorialStep: null,
    chat: [],

    startGame(players) {
      clearTimers();
      unlockAudio(); // runs within the start-button gesture so AI sounds work
      const seed = (Math.floor(Math.random() * 1_000_000) + 1) | 0;
      const config: GameConfig = { players, seed };
      const game = newGame({ players, seed });
      set({
        config,
        actions: [],
        history: [game],
        game,
        rng: mulberry32(seed ^ 0x9e3779b9),
        selection: { tokens: {} },
        message: null,
        purchaseSource: null,
        replayActive: false,
        replayIndex: 0,
        replayPlaying: false,
      });
      persist(config, []);
      scheduleAI();
    },

    resumeGame() {
      const snap = loadSnapshot();
      if (!snap) return false;
      clearTimers();
      let history: GameState[];
      try {
        history = rebuildHistory(snap.config, snap.actions);
      } catch {
        return false;
      }
      set({
        config: snap.config,
        actions: snap.actions,
        history,
        game: history[history.length - 1],
        rng: mulberry32((snap.config.seed ^ 0x9e3779b9) >>> 0),
        selection: { tokens: {} },
        message: null,
        purchaseSource: null,
        replayActive: false,
        replayIndex: 0,
        replayPlaying: false,
      });
      scheduleAI();
      return true;
    },

    hasSave() {
      const snap = loadSnapshot();
      return !!snap && snap.actions !== undefined;
    },

    abandon() {
      clearTimers();
      if (typeof window !== "undefined") window.localStorage.removeItem(SAVE_KEY);
      set({
        config: null,
        actions: [],
        history: [],
        game: null,
        selection: { tokens: {} },
        message: null,
        aiThinking: false,
        purchaseSource: null,
        replayActive: false,
        replayIndex: 0,
        replayPlaying: false,
      });
    },

    startTutorial() {
      clearTimers();
      unlockAudio();
      const seed = 4242;
      const players: PlayerConfig[] = [{ name: "나", isAI: false }];
      const game = newGame({ players, seed, startPlayerIndex: 0 });
      // Pre-stock the learner so a card is ALWAYS purchasable at step ②, no matter
      // which 3 tokens they take first. Find the cheapest visible Level-1 card and give
      // exactly enough color tokens to afford it, plus 2 gold as a forgiving buffer.
      // The cheapest L1 card is ≤5 tokens, so total stays low and taking 3 more never
      // trips the 10-token limit → no surprise forced-discard mid-tutorial.
      const lvl1 = game.board[1].filter((c): c is Card => c !== null);
      const totalCost = (c: Card) => GEM_COLORS.reduce((s, g) => s + c.cost[g], 0);
      const target = lvl1.reduce((a, b) => (totalCost(b) < totalCost(a) ? b : a));
      for (const c of GEM_COLORS) {
        const give = target.cost[c];
        game.players[0].tokens[c] = give;
        game.pool[c] = Math.max(0, game.pool[c] - give);
      }
      game.players[0].tokens.gold = 2;
      game.pool.gold = Math.max(0, game.pool.gold - 2);
      set({
        config: { players, seed },
        actions: [],
        history: [game],
        game,
        rng: mulberry32((seed ^ 0x9e3779b9) >>> 0),
        selection: { tokens: {} },
        message: null,
        purchaseSource: null,
        replayActive: false,
        replayIndex: 0,
        replayPlaying: false,
        online: null,
        tutorialStep: 0,
      });
    },

    tutorialNext() {
      set((s) => (s.tutorialStep == null ? s : { tutorialStep: s.tutorialStep + 1 }));
    },

    endTutorial() {
      clearTimers();
      set({
        config: null,
        actions: [],
        history: [],
        game: null,
        selection: { tokens: {} },
        message: null,
        aiThinking: false,
        purchaseSource: null,
        replayActive: false,
        replayIndex: 0,
        replayPlaying: false,
        tutorialStep: null,
      });
    },

    toggleToken(color) {
      const { game, selection, replayActive } = get();
      if (!game || replayActive) return;
      const cur = game.players[game.currentPlayerIndex];
      if (cur.isAI || game.pendingDiscard || game.pendingNoble || game.phase === "finished") return;

      const tokens = { ...selection.tokens };
      const count = tokens[color] ?? 0;
      const distinct = GEM_COLORS.filter((c) => (tokens[c] ?? 0) > 0);
      const totalSelected = GEM_COLORS.reduce((s, c) => s + (tokens[c] ?? 0), 0);
      const anyTwo = GEM_COLORS.some((c) => (tokens[c] ?? 0) === 2);

      if (count === 2) {
        delete tokens[color];
      } else if (count === 1) {
        if (distinct.length === 1 && game.pool[color] >= 4) tokens[color] = 2;
        else delete tokens[color];
      } else {
        if (anyTwo) {
          set({ selection: { tokens: { [color]: 1 } }, message: null });
          return;
        }
        if (game.pool[color] < 1) {
          set({ message: "그 색은 토큰이 없습니다" });
          return;
        }
        if (totalSelected >= 3) {
          set({ message: "최대 3개까지 선택" });
          return;
        }
        tokens[color] = 1;
      }
      set({ selection: { tokens }, message: null });
    },

    clearSelection() {
      set({ selection: { tokens: {} } });
    },

    confirmTake() {
      const { selection } = get();
      const tokens = selection.tokens;
      const twoColor = GEM_COLORS.find((c) => (tokens[c] ?? 0) === 2);
      const action: Action = twoColor
        ? { type: "TAKE_TWO", color: twoColor }
        : { type: "TAKE_THREE", colors: GEM_COLORS.filter((c) => (tokens[c] ?? 0) === 1) };
      commit(action);
    },

    reserve(source) {
      commit({ type: "RESERVE", source });
    },

    openPurchase(source) {
      const { game } = get();
      if (!game) return;
      const v = validate(game, { type: "PURCHASE", source });
      if (!v.ok) {
        set({ message: v.reason ?? "구매할 수 없습니다" });
        return;
      }
      set({ purchaseSource: source });
    },

    cancelPurchase() {
      set({ purchaseSource: null });
    },

    confirmPurchase(payment) {
      const { purchaseSource } = get();
      if (!purchaseSource) return;
      commit(payment ? { type: "PURCHASE", source: purchaseSource, payment } : { type: "PURCHASE", source: purchaseSource });
      set({ purchaseSource: null });
    },

    discard(tokens) {
      commit({ type: "DISCARD_TOKENS", tokens });
    },

    autoDiscard() {
      const { game } = get();
      if (!game) return;
      commit({ type: "DISCARD_TOKENS", tokens: computeAutoDiscard(game) });
    },

    chooseNoble(id) {
      commit({ type: "CHOOSE_NOBLE", nobleId: id });
    },

    canUndo() {
      const { history, replayActive } = get();
      if (replayActive || history.length < 2) return false;
      const last = history.length - 1;
      for (let j = last - 1; j >= 0; j--) {
        if (isHumanDecision(history[j])) return true;
      }
      return false;
    },

    undo() {
      const s = get();
      if (s.replayActive || s.history.length < 2) return;
      const last = s.history.length - 1;
      for (let j = last - 1; j >= 0; j--) {
        if (isHumanDecision(s.history[j])) {
          clearTimers();
          const history = s.history.slice(0, j + 1);
          const actions = s.actions.slice(0, j);
          set({
            history,
            actions,
            game: history[j],
            selection: { tokens: {} },
            message: null,
            purchaseSource: null,
            aiThinking: false,
          });
          if (s.config) persist(s.config, actions);
          return;
        }
      }
    },

    enterReplay() {
      const s = get();
      if (!s.config || s.history.length === 0) return;
      clearTimers();
      set({ replayActive: true, replayIndex: 0, replayPlaying: false, game: s.history[0], purchaseSource: null, aiThinking: false });
    },

    exitReplay() {
      const s = get();
      if (replayTimer) {
        clearInterval(replayTimer);
        replayTimer = null;
      }
      const live = s.history[s.history.length - 1];
      set({ replayActive: false, replayPlaying: false, game: live });
      scheduleAI();
    },

    replayTo(index) {
      const s = get();
      if (!s.replayActive) return;
      const i = Math.max(0, Math.min(index, s.history.length - 1));
      set({ replayIndex: i, game: s.history[i] });
    },

    replayStep(delta) {
      get().replayTo(get().replayIndex + delta);
    },

    replayPlayPause() {
      const s = get();
      if (!s.replayActive) return;
      if (s.replayPlaying) {
        if (replayTimer) {
          clearInterval(replayTimer);
          replayTimer = null;
        }
        set({ replayPlaying: false });
        return;
      }
      // start playing
      if (s.replayIndex >= s.history.length - 1) get().replayTo(0);
      set({ replayPlaying: true });
      replayTimer = setInterval(() => {
        const st = get();
        if (!st.replayActive) {
          if (replayTimer) clearInterval(replayTimer);
          replayTimer = null;
          return;
        }
        if (st.replayIndex >= st.history.length - 1) {
          if (replayTimer) clearInterval(replayTimer);
          replayTimer = null;
          set({ replayPlaying: false });
          return;
        }
        get().replayTo(st.replayIndex + 1);
      }, SPEED_MS[get().speed]);
    },

    setSpeed(speed) {
      set({ speed });
      saveSettings(speed, get().sound);
    },

    setSound(sound) {
      setSoundEnabled(sound);
      unlockAudio();
      set({ sound });
      saveSettings(get().speed, sound);
    },

    setMessage(m) {
      set({ message: m });
    },

    // ---- online multiplayer ----
    openOnline() {
      clearTimers();
      set({
        game: null,
        actions: [],
        history: [],
        online: {
          view: "menu",
          code: null,
          clientId: getClientId(),
          hostId: null,
          seats: {},
          status: "lobby",
          config: null,
          turnStartedAt: null,
          presence: [],
          error: supabaseEnabled ? null : "온라인 기능이 설정되지 않았습니다.",
        },
      });
    },

    closeOnline() {
      get().leaveRoom();
    },

    async createRoom(players, turnSeconds = 60, aiTakeover = true, quick = false) {
      if (!supabase) {
        set((s) => ({ online: s.online ? { ...s.online, error: "온라인 미설정" } : s.online }));
        return;
      }
      clearTimers();
      const clientId = getClientId();
      const seed = (Math.floor(Math.random() * 1_000_000) + 1) | 0;
      const config: GameConfig = { players, seed, turnSeconds: turnSeconds || null, aiTakeover, quick };
      const firstHuman = players.findIndex((p) => !p.isAI);
      const seats: Record<string, string> = firstHuman >= 0 ? { [String(firstHuman)]: clientId } : {};
      let code = genRoomCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const { error } = await supabase
          .from("rooms")
          .insert({ code, config, actions: [], seats, status: "lobby", host: clientId });
        if (!error) break;
        if (attempt === 4) {
          set((s) => ({ online: s.online ? { ...s.online, error: `방 생성 실패: ${error.message}` } : s.online }));
          return;
        }
        code = genRoomCode();
      }
      set({
        online: { view: "room", code, clientId, hostId: clientId, seats, status: "lobby", config, turnStartedAt: null, presence: [], error: null },
      });
      rememberRoom(code);
      subscribeRoom(code);
    },

    async joinRoom(code) {
      if (!supabase) return false;
      code = code.trim().toUpperCase();
      if (!code) return false;
      clearTimers();
      const clientId = getClientId();
      const { data, error } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
      if (error || !data) {
        set((s) => ({
          online: s.online
            ? { ...s.online, error: "방을 찾을 수 없습니다." }
            : { view: "menu", code: null, clientId, hostId: null, seats: {}, status: "lobby", config: null, turnStartedAt: null, presence: [], error: "방을 찾을 수 없습니다." },
        }));
        return false;
      }
      const row = data as RoomRow;
      const config: GameConfig = {
        players: row.config.players as PlayerConfig[],
        seed: row.config.seed,
        turnSeconds: row.config.turnSeconds ?? null,
        aiTakeover: row.config.aiTakeover,
        quick: row.config.quick,
      };
      set({
        online: {
          view: "room",
          code,
          clientId,
          hostId: row.host,
          seats: row.seats ?? {},
          status: row.status === "lobby" ? "lobby" : "playing",
          config,
          turnStartedAt: null,
          presence: [],
          error: null,
        },
      });
      rememberRoom(code);
      subscribeRoom(code);
      applyRoom(row);
      return true;
    },

    async quickMatch(playersCount = 2) {
      if (!supabase) {
        get().openOnline();
        return;
      }
      const count = Math.min(4, Math.max(2, playersCount | 0));
      if (!get().online) get().openOnline();
      set({ matching: true });
      try {
        // 1) look for an open public quick room of the same size (recent, lobby, free seat)
        const cutoff = new Date(Date.now() - 120000).toISOString();
        const { data } = await supabase
          .from("rooms")
          .select("*")
          .eq("status", "lobby")
          .gte("updated_at", cutoff)
          .order("updated_at", { ascending: false })
          .limit(40);
        const rooms = (data ?? []) as RoomRow[];
        const myId = getClientId();
        for (const r of rooms) {
          if (!r.config?.quick || r.host === myId) continue;
          const players = r.config.players ?? [];
          if (players.length !== count) continue; // match same player count only
          const humanIdx = players.map((p, i) => ({ p, i })).filter((x) => !x.p.isAI).map((x) => x.i);
          const free = humanIdx.find((i) => !(r.seats ?? {})[String(i)]);
          if (free == null) continue;
          const ok = await get().joinRoom(r.code);
          if (!ok) continue;
          const o = get().online;
          const pl = o?.config?.players ?? [];
          const hi = pl.map((p, i) => ({ p, i })).filter((x) => !x.p.isAI).map((x) => x.i);
          const f = hi.find((i) => !o!.seats[String(i)]);
          if (f != null) await get().claimSeat(f);
          set({ matching: false });
          return;
        }
        // 2) none found -> host a public quick room of the requested size, wait for opponents
        quickStarting = false;
        const newPlayers: PlayerConfig[] = Array.from({ length: count }, (_, i) => ({
          name: `플레이어 ${i + 1}`,
          isAI: false,
        }));
        await get().createRoom(newPlayers, 60, true, true);
      } finally {
        set({ matching: false });
      }
    },

    async tryReconnect() {
      if (!supabase || typeof window === "undefined") return;
      const code = window.localStorage.getItem(ROOM_KEY);
      const s = get();
      if (!code || s.online || s.game) return;
      const ok = await get().joinRoom(code);
      if (!ok) {
        forgetRoom();
        get().leaveRoom();
      }
    },

    async claimSeat(seat) {
      const s = get();
      if (!s.online || !s.online.code || !supabase || !s.online.config) return;
      if (s.online.config.players[seat]?.isAI) return; // AI seats aren't claimable
      const seats = { ...s.online.seats };
      for (const k of Object.keys(seats)) if (seats[k] === s.online.clientId) delete seats[k];
      if (seats[String(seat)] && seats[String(seat)] !== s.online.clientId) {
        set({ message: "이미 점유된 좌석입니다" });
        return;
      }
      seats[String(seat)] = s.online.clientId;
      set((st) => ({ online: st.online ? { ...st.online, seats } : st.online }));
      const { error } = await supabase.from("rooms").update({ seats }).eq("code", s.online.code);
      if (error) set({ message: `좌석 오류: ${error.message}` });
    },


    async startRoom() {
      const s = get();
      if (!s.online || !s.online.code || !supabase) return;
      if (s.online.clientId !== s.online.hostId) return;
      const { error } = await supabase.from("rooms").update({ status: "playing" }).eq("code", s.online.code);
      if (error) set({ message: `시작 오류: ${error.message}` });
      else void pollRoom();
    },

    async rematch() {
      const s = get();
      if (!s.online || !s.online.code || !supabase || !s.online.config) return;
      if (s.online.clientId !== s.online.hostId) return;
      // same players & seats, new seed
      const seed = (Math.floor(Math.random() * 1_000_000) + 1) | 0;
      const config: GameConfig = { players: s.online.config.players, seed };
      const { error } = await supabase
        .from("rooms")
        .update({ config, actions: [], status: "playing" })
        .eq("code", s.online.code);
      if (error) set({ message: `재시작 오류: ${error.message}` });
      else void pollRoom();
    },

    leaveRoom() {
      clearTimers();
      forgetRoom();
      if (roomPoll) {
        clearInterval(roomPoll);
        roomPoll = null;
      }
      if (turnTimer) {
        clearInterval(turnTimer);
        turnTimer = null;
      }
      if (presenceTimer) {
        clearInterval(presenceTimer);
        presenceTimer = null;
      }
      // best-effort: remove my presence row
      const code = get().online?.code;
      const cid = get().online?.clientId;
      if (supabase && code && cid)
        supabase.from("presence").delete().eq("room", code).eq("client", cid).then(() => {});
      takeoverForLen = -1;
      quickStarting = false;
      if (roomChannel && supabase) {
        supabase.removeChannel(roomChannel);
        roomChannel = null;
      }
      lastMsgId = 0;
      set({
        online: null,
        game: null,
        actions: [],
        history: [],
        selection: { tokens: {} },
        message: null,
        aiThinking: false,
        chat: [],
        matching: false,
      });
    },

    async sendChat(text) {
      const s = get();
      const body = text.trim().slice(0, 300);
      if (!s.online || !s.online.code || !supabase || !body) return;
      const { error } = await supabase
        .from("messages")
        .insert({ room: s.online.code, client: s.online.clientId, name: myDisplayName(s), text: body });
      if (error) set({ message: `채팅 오류: ${error.message}` });
      else void pollMessages();
    },

    controlsCurrent() {
      return controlsCurrentImpl(get());
    },

    canActMain() {
      const s = get();
      if (!s.game || s.replayActive || s.game.pendingDiscard || s.game.pendingNoble) return false;
      if (s.game.phase === "finished") return false;
      return controlsCurrentImpl(s);
    },
  };
});

export type { AILevel };
