"use client";

import { create } from "zustand";
import { aiAction } from "@/lib/ai/ai";
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
  setMessage: (m: string | null) => void;
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

function loadSpeed(): Speed {
  if (typeof window === "undefined") return "normal";
  try {
    const v = window.localStorage.getItem(SETTINGS_KEY);
    if (v && JSON.parse(v).speed) return JSON.parse(v).speed as Speed;
  } catch {
    /* ignore */
  }
  return "normal";
}

export const useGame = create<Store>((set, get) => {
  let aiTimer: ReturnType<typeof setTimeout> | null = null;
  let replayTimer: ReturnType<typeof setInterval> | null = null;

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
    const v = validate(s.game, action);
    if (!v.ok) {
      set({ message: v.reason ?? "잘못된 행동" });
      return;
    }
    const next = applyAction(s.game, action, s.rng);
    const actions = [...s.actions, action];
    const history = [...s.history, next];
    set({ game: next, actions, history, selection: { tokens: {} }, message: null });
    if (s.config) persist(s.config, actions);
    scheduleAI();
  }

  function scheduleAI() {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    const s = get();
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
        const next = applyAction(st.game, action, st.rng);
        const actions = [...st.actions, action];
        const history = [...st.history, next];
        set({ game: next, actions, history });
        if (st.config) persist(st.config, actions);
      } catch (e) {
        set({ aiThinking: false, message: `AI 오류: ${(e as Error).message}` });
        return;
      }
      scheduleAI();
    }, SPEED_MS[get().speed]);
  }

  function findCard(
    game: GameState,
    source: Extract<CardSource, { from: "board" | "reserved" }>,
  ): Card | null {
    if (source.from === "board") return game.board[source.level][source.slot] ?? null;
    return game.players[game.currentPlayerIndex].reserved.find((c) => c.id === source.cardId) ?? null;
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
    speed: loadSpeed(),
    purchaseSource: null,
    replayActive: false,
    replayIndex: 0,
    replayPlaying: false,

    startGame(players) {
      clearTimers();
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
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ speed }));
        } catch {
          /* ignore */
        }
      }
    },

    setMessage(m) {
      set({ message: m });
    },
  };
});

export type { AILevel };
