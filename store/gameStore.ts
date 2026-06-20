"use client";

import { create } from "zustand";
import { aiAction } from "@/lib/ai/ai";
import { triggerFly } from "@/lib/flyTrigger";
import { runEffects } from "@/lib/effects";
import { setSoundEnabled, unlockAudio } from "@/lib/sound";
import { supabase, supabaseEnabled, RoomRow } from "@/lib/supabase";
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
  createRoom: (players: PlayerConfig[]) => Promise<void>;
  joinRoom: (code: string) => Promise<boolean>;
  tryReconnect: () => Promise<void>;
  claimSeat: (seat: number) => Promise<void>;
  startRoom: () => Promise<void>;
  rematch: () => Promise<void>;
  leaveRoom: () => void;
  controlsCurrent: () => boolean;
  canActMain: () => boolean;
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
    if (s.config) persist(s.config, actions);
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

  async function pollRoom() {
    const s = get();
    if (!s.online || !s.online.code || !supabase) return;
    const { data } = await supabase.from("rooms").select("*").eq("code", s.online.code).maybeSingle();
    if (data) applyRoom(data as RoomRow);
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
    set({ game: next, actions, history, selection: { tokens: {} }, message: null });
    runEffects(s.game, next, action);
    const status = next.phase === "finished" ? "finished" : "playing";
    supabase
      .from("rooms")
      .update({ actions, status })
      .eq("code", s.online.code)
      .then(({ error }) => {
        if (error) set({ message: `동기화 오류: ${error.message}` });
      });
    maybeHostAI();
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

  /** Host drives AI seats: append the AI action when it's an AI player's turn. */
  function maybeHostAI() {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    const s = get();
    if (!s.online || s.online.status !== "playing" || !s.game || s.game.phase === "finished") {
      set({ aiThinking: false });
      return;
    }
    const cur = s.game.players[s.game.currentPlayerIndex];
    if (!cur.isAI || s.online.clientId !== s.online.hostId) {
      set({ aiThinking: false });
      return;
    }
    set({ aiThinking: true });
    aiTimer = setTimeout(() => {
      const st = get();
      if (!st.online || st.online.status !== "playing" || !st.game) return;
      const g = st.game;
      if (!g.players[g.currentPlayerIndex].isAI || st.online.clientId !== st.online.hostId) {
        set({ aiThinking: false });
        return;
      }
      try {
        onlineApplyAndPush(aiAction(g, st.rng));
      } catch (e) {
        set({ aiThinking: false, message: `AI 오류: ${(e as Error).message}` });
      }
    }, SPEED_MS[get().speed] + 200);
  }

  /** Reconcile local state with an incoming room row (realtime or fetch). */
  function applyRoom(row: RoomRow) {
    const s = get();
    if (!s.online || s.online.code !== row.code) return;
    const config: GameConfig = { players: row.config.players as PlayerConfig[], seed: row.config.seed };
    const incoming = (row.actions ?? []) as Action[];
    // A new seed means a rematch/reset — force a full rebuild.
    const seedChanged = !!s.online.config && s.online.config.seed !== config.seed;

    // Still in the lobby: just track metadata; no game to build yet.
    if (row.status === "lobby") {
      set({
        game: null,
        online: { ...s.online, seats: row.seats ?? {}, hostId: row.host, status: "lobby", config },
      });
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
      maybeHostAI();
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
      },
    });
    maybeHostAI();
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
      .subscribe();
    // Polling fallback so sync works even if realtime is unavailable.
    if (roomPoll) clearInterval(roomPoll);
    roomPoll = setInterval(() => void pollRoom(), 1200);
    void pollRoom();
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
          error: supabaseEnabled ? null : "온라인 기능이 설정되지 않았습니다.",
        },
      });
    },

    closeOnline() {
      get().leaveRoom();
    },

    async createRoom(players) {
      if (!supabase) {
        set((s) => ({ online: s.online ? { ...s.online, error: "온라인 미설정" } : s.online }));
        return;
      }
      clearTimers();
      const clientId = getClientId();
      const seed = (Math.floor(Math.random() * 1_000_000) + 1) | 0;
      const config: GameConfig = { players, seed };
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
        online: { view: "room", code, clientId, hostId: clientId, seats, status: "lobby", config, error: null },
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
            : { view: "menu", code: null, clientId, hostId: null, seats: {}, status: "lobby", config: null, error: "방을 찾을 수 없습니다." },
        }));
        return false;
      }
      const row = data as RoomRow;
      const config: GameConfig = { players: row.config.players as PlayerConfig[], seed: row.config.seed };
      set({
        online: {
          view: "room",
          code,
          clientId,
          hostId: row.host,
          seats: row.seats ?? {},
          status: row.status === "lobby" ? "lobby" : "playing",
          config,
          error: null,
        },
      });
      rememberRoom(code);
      subscribeRoom(code);
      applyRoom(row);
      return true;
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
      if (roomChannel && supabase) {
        supabase.removeChannel(roomChannel);
        roomChannel = null;
      }
      set({
        online: null,
        game: null,
        actions: [],
        history: [],
        selection: { tokens: {} },
        message: null,
        aiThinking: false,
      });
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
