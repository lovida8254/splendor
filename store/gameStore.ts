"use client";

import { create } from "zustand";
import { aiAction } from "@/lib/ai/ai";
import {
  Action,
  AILevel,
  applyAction,
  autoDiscard,
  CardSource,
  GameState,
  GemColor,
  GEM_COLORS,
  mulberry32,
  newGame,
  PlayerConfig,
  RNG,
  TokenColor,
  validate,
} from "@/lib/engine";

const SAVE_KEY = "splendor:save:v1";
const AI_DELAY_MS = 650;

export interface GameConfig {
  players: PlayerConfig[];
  seed: number;
}

interface SaveSnapshot {
  game: GameState;
  config: GameConfig;
}

interface Selection {
  // color -> count (1 or 2)
  tokens: Partial<Record<GemColor, number>>;
}

interface Store {
  game: GameState | null;
  config: GameConfig | null;
  rng: RNG;
  selection: Selection;
  message: string | null;
  aiThinking: boolean;

  startGame: (players: PlayerConfig[]) => void;
  resumeGame: () => boolean;
  hasSave: () => boolean;
  abandon: () => void;

  toggleToken: (color: GemColor) => void;
  clearSelection: () => void;
  confirmTake: () => void;

  reserve: (source: Extract<CardSource, { from: "board" | "deck" }>) => void;
  purchase: (source: Extract<CardSource, { from: "board" | "reserved" }>) => void;
  discard: (tokens: Partial<Record<TokenColor, number>>) => void;
  autoDiscard: () => void;
  chooseNoble: (id: string) => void;

  setMessage: (m: string | null) => void;
}

function persist(game: GameState, config: GameConfig) {
  if (typeof window === "undefined") return;
  try {
    const snap: SaveSnapshot = { game, config };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
  } catch {
    /* ignore quota/serialization issues */
  }
}

function loadSnapshot(): SaveSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveSnapshot;
  } catch {
    return null;
  }
}

export const useGame = create<Store>((set, get) => {
  /** Apply an action, persist, and hand off to the AI if it's now its turn. */
  function commit(action: Action) {
    const { game, rng, config } = get();
    if (!game) return;
    const v = validate(game, action);
    if (!v.ok) {
      set({ message: v.reason ?? "잘못된 행동" });
      return;
    }
    const next = applyAction(game, action, rng);
    set({ game: next, selection: { tokens: {} }, message: null });
    if (config) persist(next, config);
    scheduleAI();
  }

  let aiTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleAI() {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    const { game } = get();
    if (!game || game.phase === "finished") {
      set({ aiThinking: false });
      return;
    }
    const cur = game.players[game.currentPlayerIndex];
    if (!cur.isAI) {
      set({ aiThinking: false });
      return;
    }
    set({ aiThinking: true });
    aiTimer = setTimeout(() => {
      const { game: g, rng, config } = get();
      if (!g || g.phase === "finished") {
        set({ aiThinking: false });
        return;
      }
      const player = g.players[g.currentPlayerIndex];
      if (!player.isAI) {
        set({ aiThinking: false });
        return;
      }
      try {
        const action = aiAction(g, rng);
        const next = applyAction(g, action, rng);
        set({ game: next });
        if (config) persist(next, config);
      } catch (e) {
        set({ aiThinking: false, message: `AI 오류: ${(e as Error).message}` });
        return;
      }
      scheduleAI();
    }, AI_DELAY_MS);
  }

  return {
    game: null,
    config: null,
    rng: mulberry32(0x5eed),
    selection: { tokens: {} },
    message: null,
    aiThinking: false,

    startGame(players) {
      const seed = (Math.floor(Math.random() * 1_000_000) + 1) | 0;
      const config: GameConfig = { players, seed };
      const game = newGame({ players, seed });
      set({
        game,
        config,
        rng: mulberry32(seed ^ 0x9e3779b9),
        selection: { tokens: {} },
        message: null,
      });
      persist(game, config);
      scheduleAI();
    },

    resumeGame() {
      const snap = loadSnapshot();
      if (!snap) return false;
      set({
        game: snap.game,
        config: snap.config,
        rng: mulberry32((snap.config.seed ^ 0x12345) >>> 0),
        selection: { tokens: {} },
        message: null,
      });
      scheduleAI();
      return true;
    },

    hasSave() {
      return loadSnapshot() !== null;
    },

    abandon() {
      if (typeof window !== "undefined") window.localStorage.removeItem(SAVE_KEY);
      if (aiTimer) clearTimeout(aiTimer);
      set({ game: null, config: null, selection: { tokens: {} }, message: null, aiThinking: false });
    },

    toggleToken(color) {
      const { game, selection } = get();
      if (!game) return;
      const cur = game.players[game.currentPlayerIndex];
      if (cur.isAI || game.pendingDiscard || game.pendingNoble || game.phase === "finished") return;

      const tokens = { ...selection.tokens };
      const count = tokens[color] ?? 0;
      const distinct = Object.keys(tokens).filter((c) => (tokens[c as GemColor] ?? 0) > 0);
      const totalSelected = GEM_COLORS.reduce((s, c) => s + (tokens[c] ?? 0), 0);
      const anyTwo = GEM_COLORS.some((c) => (tokens[c] ?? 0) === 2);

      if (count === 2) {
        delete tokens[color];
      } else if (count === 1) {
        // Upgrade to "take two" only if alone and supply allows.
        if (distinct.length === 1 && game.pool[color] >= 4) {
          tokens[color] = 2;
        } else {
          delete tokens[color];
        }
      } else {
        // count === 0: try to add a single.
        if (anyTwo) {
          // Replace the pending "take two" with this single pick.
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
      const { game, selection } = get();
      if (!game) return;
      const tokens = selection.tokens;
      const twoColor = GEM_COLORS.find((c) => (tokens[c] ?? 0) === 2);
      let action: Action;
      if (twoColor) {
        action = { type: "TAKE_TWO", color: twoColor };
      } else {
        const colors = GEM_COLORS.filter((c) => (tokens[c] ?? 0) === 1);
        action = { type: "TAKE_THREE", colors };
      }
      commit(action);
    },

    reserve(source) {
      commit({ type: "RESERVE", source });
    },

    purchase(source) {
      commit({ type: "PURCHASE", source });
    },

    discard(tokens) {
      commit({ type: "DISCARD_TOKENS", tokens });
    },

    autoDiscard() {
      const { game } = get();
      if (!game) return;
      commit({ type: "DISCARD_TOKENS", tokens: autoDiscard(game) });
    },

    chooseNoble(id) {
      commit({ type: "CHOOSE_NOBLE", nobleId: id });
    },

    setMessage(m) {
      set({ message: m });
    },
  };
});

export type { AILevel };
