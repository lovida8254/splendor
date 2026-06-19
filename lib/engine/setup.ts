import { ALL_CARDS, ALL_NOBLES } from "./data";
import {
  AILevel,
  Card,
  CardLevel,
  GameState,
  Noble,
  Player,
  RNG,
} from "./types";
import { mulberry32, shuffle, zeroBonus, zeroTokens } from "./util";

export interface PlayerConfig {
  name: string;
  isAI: boolean;
  aiLevel?: AILevel;
}

export interface NewGameOptions {
  players: PlayerConfig[];
  seed?: number;
  startPlayerIndex?: number;
}

/** Per-player-count setup variables (PRD 2.4). */
export function setupConfig(playerCount: number): { tokens: number; gold: number; nobles: number } {
  switch (playerCount) {
    case 2:
      return { tokens: 4, gold: 5, nobles: 3 };
    case 3:
      return { tokens: 5, gold: 5, nobles: 4 };
    case 4:
      return { tokens: 7, gold: 5, nobles: 5 };
    default:
      throw new Error(`Splendor supports 2-4 players, got ${playerCount}`);
  }
}

function makePlayer(cfg: PlayerConfig, index: number): Player {
  return {
    id: `P${index + 1}`,
    name: cfg.name,
    isAI: cfg.isAI,
    aiLevel: cfg.aiLevel,
    tokens: zeroTokens(),
    bonuses: zeroBonus(),
    reserved: [],
    purchased: [],
    nobles: [],
    prestige: 0,
  };
}

export function newGame(opts: NewGameOptions): GameState {
  const count = opts.players.length;
  const cfg = setupConfig(count);
  const seed = opts.seed ?? 0x5eed;
  const rng: RNG = mulberry32(seed);

  // Build and shuffle the three card decks.
  const decks: Record<CardLevel, Card[]> = { 1: [], 2: [], 3: [] };
  for (const level of [1, 2, 3] as CardLevel[]) {
    decks[level] = shuffle(
      ALL_CARDS.filter((c) => c.level === level).map((c) => ({ ...c })),
      rng,
    );
  }

  // Deal 4 face-up per level (top of deck = end of array).
  const board: Record<CardLevel, (Card | null)[]> = { 1: [], 2: [], 3: [] };
  for (const level of [1, 2, 3] as CardLevel[]) {
    board[level] = [0, 1, 2, 3].map(() => decks[level].pop() ?? null);
  }

  // Reveal (playerCount + 1) nobles, discard the rest.
  const nobles: Noble[] = shuffle(
    ALL_NOBLES.map((n) => ({ ...n })),
    rng,
  ).slice(0, cfg.nobles);

  const players = opts.players.map(makePlayer);

  // Fill the supply.
  const pool = zeroTokens();
  for (const c of ["white", "blue", "green", "red", "black"] as const) pool[c] = cfg.tokens;
  pool.gold = cfg.gold;

  const startPlayerIndex = opts.startPlayerIndex ?? Math.floor(rng() * count);

  return {
    players,
    pool,
    board,
    decks,
    nobles,
    currentPlayerIndex: startPlayerIndex,
    startPlayerIndex,
    turnCount: 0,
    round: 1,
    phase: "playing",
    finalRoundTriggeredBy: null,
    winnerId: null,
    log: [],
    pendingDiscard: false,
    pendingNoble: null,
  };
}
