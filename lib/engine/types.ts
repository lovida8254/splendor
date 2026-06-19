// Core domain types for the Splendor engine.
// The engine is a set of pure functions: applyAction(state, action) -> newState.
// No React/DOM dependency. Randomness is injected via an RNG so games are reproducible.

export type GemColor = "white" | "blue" | "green" | "red" | "black";
export type TokenColor = GemColor | "gold";
export type CardLevel = 1 | 2 | 3;

export const GEM_COLORS: GemColor[] = ["white", "blue", "green", "red", "black"];
export const TOKEN_COLORS: TokenColor[] = [...GEM_COLORS, "gold"];
export const CARD_LEVELS: CardLevel[] = [1, 2, 3];

/** Tokens by color, including gold. */
export type TokenPool = Record<TokenColor, number>;
/** Card cost by gem color (never includes gold). */
export type GemCost = Record<GemColor, number>;
/** Accumulated card bonuses by gem color. */
export type BonusMap = Record<GemColor, number>;

export interface Card {
  id: string;
  level: CardLevel;
  prestige: number; // 0..5
  bonus: GemColor; // permanent discount color
  cost: GemCost;
}

export interface Noble {
  id: string;
  name?: string;
  prestige: 3;
  requirement: BonusMap; // required card bonuses by color
}

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  aiLevel?: AILevel;
  tokens: TokenPool; // includes gold, total <= 10 at end of turn
  bonuses: BonusMap; // accumulated from purchased cards
  reserved: Card[]; // up to 3
  purchased: Card[]; // ledger of bought cards
  nobles: Noble[];
  prestige: number; // cards + nobles
}

export type AILevel = "easy" | "normal" | "hard";

export type GamePhase = "playing" | "finalRound" | "finished";

export interface GameEvent {
  turn: number;
  playerId: string;
  type: string;
  detail: string;
}

export interface GameState {
  players: Player[];
  pool: TokenPool; // supply
  board: Record<CardLevel, (Card | null)[]>; // 4 face-up slots per level
  decks: Record<CardLevel, Card[]>; // hidden remaining cards (top = end of array)
  nobles: Noble[]; // available nobles
  currentPlayerIndex: number;
  turnCount: number; // number of completed turns
  round: number; // 1-based round number
  phase: GamePhase;
  finalRoundTriggeredBy: string | null; // id of first player to reach 15
  startPlayerIndex: number;
  winnerId: string | null;
  log: GameEvent[];
  // Pending end-of-turn resolutions that block the next player:
  pendingDiscard: boolean; // current player must discard down to 10
  pendingNoble: string[] | null; // eligible noble ids when a choice is required
}

export type CardSource =
  | { from: "board"; level: CardLevel; slot: number }
  | { from: "deck"; level: CardLevel }
  | { from: "reserved"; cardId: string };

export type Action =
  | { type: "TAKE_THREE"; colors: GemColor[] } // 1..3 distinct colors
  | { type: "TAKE_TWO"; color: GemColor }
  | { type: "RESERVE"; source: Extract<CardSource, { from: "board" | "deck" }> }
  | {
      type: "PURCHASE";
      source: Extract<CardSource, { from: "board" | "reserved" }>;
      payment?: TokenPool; // explicit payment plan; if omitted it is auto-computed
    }
  | { type: "DISCARD_TOKENS"; tokens: Partial<TokenPool> } // resolve >10 tokens
  | { type: "CHOOSE_NOBLE"; nobleId: string } // resolve multiple eligible nobles
  | { type: "PASS" }; // forced pass: only legal when no other action exists

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/** Deterministic RNG returning a float in [0, 1). */
export type RNG = () => number;
